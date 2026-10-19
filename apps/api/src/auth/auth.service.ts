import { Inject, Injectable, HttpException } from "@nestjs/common";
import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { Database } from "../db";
import { Prisma } from "../generated/prisma";
import { fail } from "../common";
import { digest, hashPassword, hmac, token, verifyPassword } from "./crypto";
import { AuthClock, AuthLimiter } from "./support";
import { Mailer } from "./mailer";
import {
  challengeSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  verifySchema,
} from "./schemas";

type Person = Prisma.UserGetPayload<{ include: { profile: true } }>;
type Outcome =
  | { ok: true; email: string }
  | { ok: false; status: number; code: string; message: string };
const badOtp = (
  code = "OTP_INVALID",
  message = "Mã xác thực không đúng hoặc không còn hiệu lực.",
): Outcome => ({ ok: false, status: 400, code, message });
const publicUser = (user: Person) => ({
  id: user.id,
  email: user.emailNormalized,
  displayName: user.profile?.displayName ?? "Bạn",
  verifiedAt: user.verifiedAt?.toISOString() ?? null,
});

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>;
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(Mailer) private readonly mail: Mailer,
    @Inject(AuthLimiter) private readonly limiter: AuthLimiter,
    @Inject(AuthClock) private readonly clock: AuthClock,
  ) {}
  async register(body: unknown, ip: string) {
    const input = registerSchema.parse(body);
    this.mail.assertReady();
    this.limiter.secret();
    await this.limiter.limit("register-ip", ip, 20, 3600000);
    await this.limiter.limit("register-email", input.email, 5, 3600000);
    if (
      await this.db.user.findUnique({ where: { emailNormalized: input.email } })
    )
      fail(
        409,
        "EMAIL_IN_USE",
        "Email này đã được đăng ký. Hãy đăng nhập để tiếp tục hoặc xác minh tài khoản.",
      );
    const passwordHash = await hashPassword(input.password);
    let user: Person;
    try {
      user = await this.db.user.create({
        data: {
          emailNormalized: input.email,
          passwordHash,
          termsAcceptedAt: this.clock.now(),
          profile: { create: { displayName: input.displayName } },
          preference: { create: {} },
          roles: { create: { role: { connect: { code: "USER" } } } },
        },
        include: { profile: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        fail(
          409,
          "EMAIL_IN_USE",
          "Email này đã được đăng ký. Hãy đăng nhập để tiếp tục.",
        );
      throw error;
    }
    return this.issue(user.id, "reuse");
  }
  private challengeResponse(challenge: {
    id: string;
    emailNormalized: string;
    sentAt: Date;
    expiresAt: Date;
  }) {
    return {
      verificationRequired: true as const,
      challengeId: challenge.id,
      email: challenge.emailNormalized,
      expiresAt: challenge.expiresAt.toISOString(),
      resendAt: new Date(challenge.sentAt.getTime() + 60000).toISOString(),
    };
  }
  private async issue(
    userId: string,
    mode: "reuse" | "resend",
    challengeId?: string,
  ) {
    this.mail.assertReady();
    const secret = this.limiter.secret();
    const delivery = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.status !== "PENDING_VERIFICATION")
        fail(
          409,
          "VERIFICATION_UNAVAILABLE",
          "Tài khoản không còn chờ xác minh. Hãy đăng nhập lại.",
        );
      const current = challengeId
        ? await tx.otpChallenge.findUnique({ where: { id: challengeId } })
        : await tx.otpChallenge.findFirst({
            where: {
              userId,
              purpose: "REGISTER",
              consumedAt: null,
              invalidatedAt: null,
            },
            orderBy: { sentAt: "desc" },
          });
      const now = this.clock.now();
      if (
        challengeId &&
        (!current ||
          current.userId !== userId ||
          current.purpose !== "REGISTER" ||
          current.consumedAt ||
          current.invalidatedAt)
      )
        fail(
          400,
          "OTP_INVALID",
          "Yêu cầu xác minh không còn hiệu lực. Hãy đăng nhập để nhận lại mã.",
        );
      if (current && !current.invalidatedAt && !current.consumedAt) {
        if (
          mode === "reuse" &&
          current.expiresAt > now &&
          current.attempts < current.maxAttempts
        )
          return { challenge: current, code: null };
        const wait = Math.ceil(
          (current.sentAt.getTime() + 60000 - now.getTime()) / 1000,
        );
        if (wait > 0)
          throw new HttpException(
            {
              code: "RESEND_TOO_SOON",
              message: `Vui lòng chờ ${wait} giây trước khi gửi lại mã.`,
              retryAfterSeconds: wait,
            },
            429,
          );
      }
      const id = current?.id ?? randomUUID();
      let code = String(randomInt(1000000)).padStart(6, "0");
      while (
        current?.codeHash ===
        hmac(secret, `${id}:${user.emailNormalized}:${code}`)
      )
        code = String(randomInt(1000000)).padStart(6, "0");
      const data = {
        codeHash: hmac(secret, `${id}:${user.emailNormalized}:${code}`),
        attempts: 0,
        sentAt: now,
        expiresAt: new Date(now.getTime() + 300000),
        invalidatedAt: null,
      };
      const challenge = current
        ? await tx.otpChallenge.update({ where: { id }, data })
        : await tx.otpChallenge.create({
            data: {
              id,
              userId,
              emailNormalized: user.emailNormalized,
              purpose: "REGISTER",
              createdAt: now,
              ...data,
            },
          });
      return { challenge, code };
    });
    if (delivery.code) {
      try {
        await this.mail.sendOtp(
          delivery.challenge.emailNormalized,
          delivery.code,
        );
      } catch (error) {
        await this.db.otpChallenge.updateMany({
          where: {
            id: delivery.challenge.id,
            codeHash: delivery.challenge.codeHash,
            consumedAt: null,
          },
          data: { invalidatedAt: this.clock.now() },
        });
        throw error;
      }
    }
    return this.challengeResponse(delivery.challenge);
  }
  async resend(body: unknown, ip: string) {
    const { challengeId } = challengeSchema.parse(body);
    this.limiter.secret();
    await this.limiter.limit("resend-ip", ip, 30);
    const challenge = await this.db.otpChallenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge?.userId || challenge.purpose !== "REGISTER")
      fail(400, "OTP_INVALID", "Yêu cầu xác minh không còn hiệu lực.");
    await this.limiter.limit(
      "resend-email",
      challenge.emailNormalized,
      5,
      3600000,
    );
    return this.issue(challenge.userId, "resend", challenge.id);
  }
  async verify(body: unknown, ip: string) {
    const input = verifySchema.parse(body),
      secret = this.limiter.secret();
    await this.limiter.limit("verify-ip", ip, 100);
    const reference = await this.db.otpChallenge.findUnique({
      where: { id: input.challengeId },
    });
    if (!reference?.userId)
      fail(
        400,
        "OTP_INVALID",
        "Mã xác thực không đúng hoặc không còn hiệu lực.",
      );
    const result = await this.db.$transaction<Outcome>(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${reference.userId}::uuid FOR UPDATE`;
      const current = await tx.otpChallenge.findUnique({
        where: { id: input.challengeId },
        include: { user: true },
      });
      const now = this.clock.now();
      if (
        !current ||
        current.purpose !== "REGISTER" ||
        current.consumedAt ||
        current.invalidatedAt ||
        current.user?.status !== "PENDING_VERIFICATION"
      )
        return badOtp();
      if (current.expiresAt <= now)
        return badOtp(
          "OTP_EXPIRED",
          "Mã đã hết hạn. Vui lòng yêu cầu gửi lại.",
        );
      if (current.attempts >= current.maxAttempts)
        return badOtp(
          "OTP_LOCKED",
          "Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.",
        );
      const expected = hmac(
        secret,
        `${current.id}:${current.emailNormalized}:${input.code}`,
      );
      if (
        !timingSafeEqual(
          Buffer.from(expected, "hex"),
          Buffer.from(current.codeHash, "hex"),
        )
      ) {
        await tx.otpChallenge.update({
          where: { id: current.id },
          data: { attempts: { increment: 1 } },
        });
        return badOtp();
      }
      await tx.otpChallenge.update({
        where: { id: current.id },
        data: { consumedAt: now },
      });
      await tx.user.update({
        where: { id: current.userId! },
        data: { status: "ACTIVE", verifiedAt: now },
      });
      await tx.auditLog.create({
        data: { actorId: current.userId, action: "ACCOUNT_VERIFIED" },
      });
      return { ok: true, email: current.emailNormalized };
    });
    // Throw after commit so failed-attempt counters are not rolled back.
    if (!result.ok) fail(result.status, result.code, result.message);
    return { verified: true, email: result.email };
  }
  async login(body: unknown, ip: string) {
    const input = loginSchema.parse(body);
    this.limiter.secret();
    await this.limiter.limit("login-ip", ip, 100);
    await this.limiter.limit("login-email", input.email, 10);
    const user = await this.db.user.findUnique({
      where: { emailNormalized: input.email },
      include: { profile: true },
    });
    this.dummyHash ??= hashPassword(token());
    const valid = await verifyPassword(
      input.password,
      user?.passwordHash ?? (await this.dummyHash),
    );
    if (!user || !valid || user.status === "SUSPENDED")
      fail(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
    if (user.status === "PENDING_VERIFICATION")
      return this.issue(user.id, "reuse");
    if (!user.verifiedAt)
      fail(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
    const now = this.clock.now(),
      expiresAt = new Date(
        now.getTime() + (input.remember ? 30 : 1) * 86400000,
      );
    const accessToken = token(),
      refreshToken = token(),
      accessExpiresAt = new Date(now.getTime() + 900000);
    await this.db.session.create({
      data: {
        userId: user.id,
        deviceName: input.deviceName,
        createdAt: now,
        lastSeenAt: now,
        expiresAt,
        accessTokenHash: digest(accessToken),
        accessExpiresAt,
        credentials: {
          create: {
            tokenHash: digest(refreshToken),
            createdAt: now,
            expiresAt,
          },
        },
      },
    });
    return {
      accessToken,
      refreshToken,
      accessExpiresAt: accessExpiresAt.toISOString(),
      user: publicUser(user),
    };
  }
  async refresh(body: unknown, ip: string) {
    const input = refreshSchema.parse(body);
    this.limiter.secret();
    await this.limiter.limit("refresh-ip", ip, 100);
    const reference = await this.db.refreshCredential.findUnique({
      where: { tokenHash: digest(input.refreshToken) },
    });
    if (!reference)
      fail(401, "SESSION_EXPIRED", "Phiên đã hết hạn. Vui lòng đăng nhập lại.");
    const result = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Session" WHERE "id" = ${reference.sessionId}::uuid FOR UPDATE`;
      const old = await tx.refreshCredential.findUnique({
        where: { id: reference.id },
        include: {
          session: { include: { user: { include: { profile: true } } } },
        },
      });
      const now = this.clock.now();
      if (
        !old ||
        old.session.revokedAt ||
        old.session.expiresAt <= now ||
        old.expiresAt <= now
      )
        return null;
      if (
        old.usedAt ||
        old.session.user.status !== "ACTIVE" ||
        !old.session.user.verifiedAt
      ) {
        await tx.session.update({
          where: { id: old.sessionId },
          data: {
            revokedAt: now,
            accessTokenHash: null,
            accessExpiresAt: null,
          },
        });
        return null;
      }
      const accessToken = token(),
        refreshToken = token();
      const accessExpiresAt = new Date(
        Math.min(now.getTime() + 900000, old.session.expiresAt.getTime()),
      );
      await tx.refreshCredential.update({
        where: { id: old.id },
        data: { usedAt: now },
      });
      await tx.refreshCredential.create({
        data: {
          sessionId: old.sessionId,
          tokenHash: digest(refreshToken),
          generation: old.generation + 1,
          createdAt: now,
          expiresAt: old.session.expiresAt,
        },
      });
      await tx.session.update({
        where: { id: old.sessionId },
        data: {
          accessTokenHash: digest(accessToken),
          accessExpiresAt,
          lastSeenAt: now,
        },
      });
      return {
        accessToken,
        refreshToken,
        accessExpiresAt: accessExpiresAt.toISOString(),
        user: publicUser(old.session.user),
      };
    });
    if (!result)
      fail(401, "SESSION_EXPIRED", "Phiên đã hết hạn. Vui lòng đăng nhập lại.");
    return result;
  }
  private async authenticated(authorization?: string) {
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization ?? "");
    if (!match) fail(401, "UNAUTHORIZED", "Vui lòng đăng nhập để tiếp tục.");
    const session = await this.db.session.findUnique({
      where: { accessTokenHash: digest(match[1]!) },
      include: { user: { include: { profile: true } } },
    });
    const now = this.clock.now();
    if (
      !session ||
      session.revokedAt ||
      !session.accessExpiresAt ||
      session.accessExpiresAt <= now ||
      session.expiresAt <= now ||
      session.user.status !== "ACTIVE" ||
      !session.user.verifiedAt
    )
      fail(401, "SESSION_EXPIRED", "Phiên đã hết hạn. Vui lòng đăng nhập lại.");
    return session;
  }
  async me(authorization?: string) {
    return publicUser((await this.authenticated(authorization)).user);
  }
  async logout(authorization?: string) {
    const session = await this.authenticated(authorization);
    await this.db.session.update({
      where: { id: session.id },
      data: {
        revokedAt: this.clock.now(),
        accessTokenHash: null,
        accessExpiresAt: null,
      },
    });
    return { loggedOut: true };
  }
}
