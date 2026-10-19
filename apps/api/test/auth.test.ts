import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { Mailer } from "../src/auth/mailer";
import { AuthClock } from "../src/auth/support";
import { Database } from "../src/db";
import { Errors, fail } from "../src/common";
import { seedRoles } from "../prisma/seed-roles";
import { applyMigrations } from "./migrations";
let lite: PGlite,
  socket: PGLiteSocketServer,
  app: INestApplication,
  db: Database,
  base: string;
let offset = 0,
  counter = 0,
  mailReady = true,
  mailFail = false;
const inbox: { to: string; code: string }[] = [];
const clock = { now: () => new Date(Date.now() + offset) };
const password = "DemoPassword123!";
const mail = {
  assertReady() {
    if (!mailReady)
      fail(503, "MAIL_NOT_CONFIGURED", "Chưa cấu hình email xác thực.");
  },
  async sendOtp(to: string, code: string) {
    if (mailFail)
      fail(503, "MAIL_UNAVAILABLE", "Chưa gửi được email xác thực.");
    inbox.push({ to, code });
  },
};
async function call(
  path: string,
  body?: unknown,
  bearer?: string,
  method = body === undefined ? "GET" : "POST",
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
}
function codeFor(email: string) {
  return inbox.filter((message) => message.to === email).at(-1)!.code;
}
async function registration() {
  const email = `member-${++counter}@example.com`;
  const result = await call("/auth/register", {
    email,
    password,
    displayName: "Phan Hoàng",
    acceptedTerms: true,
  });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  return { ...result.data, email };
}
async function active() {
  const pending = await registration();
  assert.equal(
    (
      await call("/auth/otp/verify", {
        challengeId: pending.challengeId,
        code: codeFor(pending.email),
      })
    ).status,
    200,
  );
  const result = await call("/auth/login", { email: pending.email, password });
  assert.equal(result.status, 200);
  return { ...result.data, email: pending.email };
}
before(async () => {
  lite = await PGlite.create();
  await applyMigrations(lite);
  socket = new PGLiteSocketServer({
    db: lite,
    host: "127.0.0.1",
    port: 15437,
    maxConnections: 3,
  });
  await socket.start();
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@127.0.0.1:15437/postgres";
  process.env.DB_POOL_MAX = "1";
  process.env.AUTH_SECRET = "test-only-secret-012345678901234567890123456789";
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Mailer)
    .useValue(mail)
    .overrideProvider(AuthClock)
    .useValue(clock)
    .compile();
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new Errors());
  await app.init();
  db = app.get(Database);
  await seedRoles(db);
  await app.listen(0, "127.0.0.1");
  base = (await app.getUrl()) + "/api/v1";
});
after(async () => {
  await app?.close();
  await socket?.stop();
  await lite?.close();
});

test("Task 5: đăng ký → email OTP → login → /me dùng dữ liệu thật, không lộ bí mật", async () => {
  const email = "  Phan.Test@Example.com  ";
  const result = await call("/auth/register", {
    email,
    password,
    displayName: "Phan",
    acceptedTerms: true,
  });
  assert.equal(result.status, 201);
  assert.equal(result.data.email, "phan.test@example.com");
  assert.match(codeFor(result.data.email), /^\d{6}$/);
  assert.ok(!JSON.stringify(result.data).includes(codeFor(result.data.email)));
  assert.ok(!("passwordHash" in result.data));
  const stored = await db.user.findUniqueOrThrow({
    where: { emailNormalized: result.data.email },
    include: { roles: true, profile: true, preference: true },
  });
  assert.equal(stored.status, "PENDING_VERIFICATION");
  assert.notEqual(stored.passwordHash, password);
  assert.match(stored.passwordHash!, /^scrypt\$/);
  assert.ok(stored.termsAcceptedAt);
  assert.equal(stored.roles.length, 1);
  assert.equal(stored.roles[0]!.roleCode, "USER");
  assert.equal(stored.profile?.displayName, "Phan");
  assert.ok(stored.preference);
  const otp = await db.otpChallenge.findUniqueOrThrow({
    where: { id: result.data.challengeId },
  });
  assert.notEqual(otp.codeHash, codeFor(result.data.email));
  assert.equal(otp.maxAttempts, 5);
  assert.equal(
    (
      await call("/auth/otp/verify", {
        challengeId: otp.id,
        code: codeFor(result.data.email),
      })
    ).status,
    200,
  );
  const login = await call("/auth/login", {
    email: result.data.email,
    password,
  });
  assert.equal(login.status, 200);
  assert.match(login.data.accessToken, /^[A-Za-z0-9_-]{43}$/);
  const me = await call("/me", undefined, login.data.accessToken);
  assert.equal(me.status, 200);
  assert.equal(me.data.id, stored.id);
  assert.equal(me.data.displayName, "Phan");
  assert.ok(!("passwordHash" in me.data));
  assert.ok(!("refreshToken" in me.data));
  const session = await db.session.findFirstOrThrow({
    where: { userId: stored.id },
    include: { credentials: true },
  });
  assert.notEqual(session.accessTokenHash, login.data.accessToken);
  assert.notEqual(session.credentials[0]!.tokenHash, login.data.refreshToken);
});
test("Task 5: đầu vào sai, không đồng ý và tự cấp ADMIN đều bị từ chối", async () => {
  for (const input of [
    { email: "bad", password, displayName: "Phan", acceptedTerms: true },
    {
      email: "invalid@example.com",
      password: "short",
      displayName: "Phan",
      acceptedTerms: true,
    },
    {
      email: "invalid@example.com",
      password,
      displayName: "Phan",
      acceptedTerms: false,
    },
    {
      email: "invalid@example.com",
      password,
      displayName: "Phan",
      acceptedTerms: true,
      role: "ADMIN",
    },
  ])
    assert.equal((await call("/auth/register", input)).status, 400);
});
test("Task 5: trùng email không ghi đè mật khẩu hoặc tên của người trước", async () => {
  const pending = await registration();
  const before = await db.user.findUniqueOrThrow({
    where: { emailNormalized: pending.email },
  });
  const duplicate = await call("/auth/register", {
    email: pending.email.toUpperCase(),
    password: "Different123!",
    displayName: "Khác",
    acceptedTerms: true,
  });
  assert.equal(duplicate.status, 409);
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: before.id } }))
      .passwordHash,
    before.passwordHash,
  );
});
test("Task 5: pending đúng password về OTP; sai password không tạo phiên", async () => {
  const pending = await registration();
  const wrong = await call("/auth/login", {
    email: pending.email,
    password: "WrongPassword!",
  });
  assert.equal(wrong.status, 401);
  const right = await call("/auth/login", { email: pending.email, password });
  assert.equal(right.status, 200);
  assert.equal(right.data.verificationRequired, true);
  assert.ok(!right.data.accessToken);
  assert.equal(right.data.challengeId, pending.challengeId);
});
test("Task 5: gửi lại chờ 60 giây, mã cũ vô hiệu, mã mới xác minh được", async () => {
  const pending = await registration(),
    old = codeFor(pending.email);
  assert.equal(
    (await call("/auth/otp/resend", { challengeId: pending.challengeId }))
      .status,
    429,
  );
  offset += 61000;
  const resent = await call("/auth/otp/resend", {
    challengeId: pending.challengeId,
  });
  assert.equal(resent.status, 200);
  assert.notEqual(codeFor(pending.email), old);
  assert.equal(
    (
      await call("/auth/otp/verify", {
        challengeId: pending.challengeId,
        code: old,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await db.otpChallenge.findUniqueOrThrow({
        where: { id: pending.challengeId },
      })
    ).attempts,
    1,
  );
  assert.equal(
    (
      await call("/auth/otp/verify", {
        challengeId: pending.challengeId,
        code: codeFor(pending.email),
      })
    ).status,
    200,
  );
});
test("Task 5: OTP hết hạn không kích hoạt tài khoản; đăng nhập tiếp tục nhận mã mới", async () => {
  const pending = await registration();
  offset += 301000;
  const expired = await call("/auth/otp/verify", {
    challengeId: pending.challengeId,
    code: codeFor(pending.email),
  });
  assert.equal(expired.data.error.code, "OTP_EXPIRED");
  assert.equal(
    (
      await db.user.findUniqueOrThrow({
        where: { emailNormalized: pending.email },
      })
    ).status,
    "PENDING_VERIFICATION",
  );
  assert.equal(
    (await call("/auth/login", { email: pending.email, password })).data
      .verificationRequired,
    true,
  );
  assert.equal(
    (
      await call("/auth/otp/verify", {
        challengeId: pending.challengeId,
        code: codeFor(pending.email),
      })
    ).status,
    200,
  );
});
test("Task 5: 5 mã sai giữ counter; cả mã đúng bị khóa cho đến khi cấp mã mới", async () => {
  const pending = await registration(),
    actual = codeFor(pending.email),
    wrong = actual === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++)
    assert.equal(
      (
        await call("/auth/otp/verify", {
          challengeId: pending.challengeId,
          code: wrong,
        })
      ).status,
      400,
    );
  assert.equal(
    (
      await db.otpChallenge.findUniqueOrThrow({
        where: { id: pending.challengeId },
      })
    ).attempts,
    5,
  );
  assert.equal(
    (
      await call("/auth/otp/verify", {
        challengeId: pending.challengeId,
        code: actual,
      })
    ).data.error.code,
    "OTP_LOCKED",
  );
  offset += 61000;
  assert.equal(
    (await call("/auth/otp/resend", { challengeId: pending.challengeId }))
      .status,
    200,
  );
  assert.equal(
    (
      await call("/auth/otp/verify", {
        challengeId: pending.challengeId,
        code: codeFor(pending.email),
      })
    ).status,
    200,
  );
});
test("Task 5: OTP chỉ tiêu thụ một lần kể cả hai request đồng thời", async () => {
  const pending = await registration(),
    body = { challengeId: pending.challengeId, code: codeFor(pending.email) };
  const results = await Promise.all([
    call("/auth/otp/verify", body),
    call("/auth/otp/verify", body),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
});
test("Task 5: gửi lại đồng thời chỉ gửi một email mới", async () => {
  const pending = await registration();
  offset += 61000;
  const count = inbox.filter((m) => m.to === pending.email).length;
  const results = await Promise.all([
    call("/auth/otp/resend", { challengeId: pending.challengeId }),
    call("/auth/otp/resend", { challengeId: pending.challengeId }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 429]);
  assert.equal(inbox.filter((m) => m.to === pending.email).length, count + 1);
});
test("Task 5: tài khoản không tồn tại và mật khẩu sai trả cùng thông báo", async () => {
  const existing = await active();
  const a = await call("/auth/login", {
    email: existing.email,
    password: "WrongPassword!",
  });
  const b = await call("/auth/login", {
    email: "does-not-exist@example.com",
    password: "WrongPassword!",
  });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.deepEqual(a.data.error, b.data.error);
});
test("Task 5: refresh xoay token; replay thu hồi cả family và access mới", async () => {
  const account = await active();
  const rotated = await call("/auth/refresh", {
    refreshToken: account.refreshToken,
  });
  assert.equal(rotated.status, 200);
  assert.notEqual(rotated.data.refreshToken, account.refreshToken);
  assert.equal((await call("/me", undefined, account.accessToken)).status, 401);
  assert.equal(
    (await call("/me", undefined, rotated.data.accessToken)).status,
    200,
  );
  assert.equal(
    (await call("/auth/refresh", { refreshToken: account.refreshToken }))
      .status,
    401,
  );
  assert.equal(
    (await call("/me", undefined, rotated.data.accessToken)).status,
    401,
  );
  assert.equal(
    (await call("/auth/refresh", { refreshToken: rotated.data.refreshToken }))
      .status,
    401,
  );
});
test("Task 5: access hết hạn có thể khôi phục bằng refresh token còn hạn", async () => {
  const account = await active();
  offset += 16 * 60000;
  assert.equal((await call("/me", undefined, account.accessToken)).status, 401);
  const restored = await call("/auth/refresh", {
    refreshToken: account.refreshToken,
  });
  assert.equal(restored.status, 200);
  assert.equal(restored.data.user.id, account.user.id);
  assert.equal(
    (await call("/me", undefined, restored.data.accessToken)).status,
    200,
  );
});
test("Task 5: đăng xuất thu hồi access và refresh; /me không cho đọc tài khoản khác", async () => {
  const account = await active();
  assert.equal((await call("/me")).status, 401);
  const me = await call(
    "/me?userId=someone-else",
    undefined,
    account.accessToken,
  );
  assert.equal(me.data.id, account.user.id);
  assert.equal(
    (await call("/auth/logout", {}, account.accessToken)).status,
    200,
  );
  assert.equal((await call("/me", undefined, account.accessToken)).status, 401);
  assert.equal(
    (await call("/auth/refresh", { refreshToken: account.refreshToken }))
      .status,
    401,
  );
});
test("Task 5: phiên không ghi nhớ hạn 1 ngày, ghi nhớ hạn 30 ngày", async () => {
  const account = await active();
  await call("/auth/login", {
    email: account.email,
    password,
    remember: false,
  });
  const sessions = await db.session.findMany({
    where: { userId: account.user.id },
  });
  assert.deepEqual(
    sessions
      .map((s) =>
        Math.round((s.expiresAt.getTime() - s.createdAt.getTime()) / 86400000),
      )
      .sort((a, b) => a - b),
    [1, 30],
  );
});
test("Task 5: lỗi gửi email không kích hoạt tài khoản, có thể đăng nhập để thử lại", async () => {
  const email = `mail-fail-${++counter}@example.com`;
  mailFail = true;
  const result = await call("/auth/register", {
    email,
    password,
    displayName: "Phan",
    acceptedTerms: true,
  });
  mailFail = false;
  assert.equal(result.status, 503);
  const pending = await db.user.findUniqueOrThrow({
    where: { emailNormalized: email },
    include: { challenges: true },
  });
  assert.equal(pending.status, "PENDING_VERIFICATION");
  assert.ok(pending.challenges[0]!.invalidatedAt);
  assert.equal(
    (await call("/auth/login", { email, password })).data.verificationRequired,
    true,
  );
});
test("Task 5: chưa cấu hình email thì trả 503 trước khi ghi tài khoản", async () => {
  const count = await db.user.count();
  mailReady = false;
  const result = await call("/auth/register", {
    email: "not-configured@example.com",
    password,
    displayName: "Phan",
    acceptedTerms: true,
  });
  mailReady = true;
  assert.equal(result.status, 503);
  assert.equal(await db.user.count(), count);
});
test("Task 5: tài khoản suspended không dùng được phiên hoặc đăng nhập", async () => {
  const account = await active();
  await db.user.update({
    where: { id: account.user.id },
    data: { status: "SUSPENDED" },
  });
  assert.equal((await call("/me", undefined, account.accessToken)).status, 401);
  assert.equal(
    (await call("/auth/refresh", { refreshToken: account.refreshToken }))
      .status,
    401,
  );
  assert.equal(
    (await call("/auth/login", { email: account.email, password })).status,
    401,
  );
});
test("Task 5: throttle tồn tại trong database và không lưu email/IP dạng rõ", async () => {
  offset += 7200000;
  const email = "bruteforce@example.com";
  for (let i = 0; i < 10; i++)
    assert.equal(
      (await call("/auth/login", { email, password: "WrongPassword!" })).status,
      401,
    );
  const limited = await call("/auth/login", {
    email,
    password: "WrongPassword!",
  });
  assert.equal(limited.status, 429);
  assert.ok(limited.data.error.retryAfterSeconds > 0);
  const rows = await db.authThrottle.findMany();
  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => /^[a-f0-9]{64}$/.test(row.key)));
  offset += 16 * 60000;
  assert.equal(
    (await call("/auth/login", { email, password: "WrongPassword!" })).status,
    401,
  );
});
test("Task 5: chưa mở forgot/reset/change password ngoài phạm vi", async () => {
  assert.equal(
    (await call("/auth/password/forgot", { email: "x@example.com" })).status,
    404,
  );
});
