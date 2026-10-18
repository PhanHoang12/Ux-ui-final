import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PrismaPg } from "@prisma/adapter-pg";
import { OtpPurpose, PrismaClient } from "../src/generated/prisma";
import { seedRoles } from "../prisma/seed-roles";

let lite: PGlite, socket: PGLiteSocketServer, db: PrismaClient;
const url = "postgresql://postgres:postgres@127.0.0.1:15436/postgres";
const createdAt = new Date("2026-01-01T00:00:00Z");
const usedAt = new Date("2026-01-01T00:01:00Z");
const expiresAt = new Date("2026-01-01T00:05:00Z");
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
let sequence = 0;

function prisma(...args: string[]): Promise<string> {
  // Always target this disposable database, never the user's .env / Neon DB.
  return new Promise((resolve, reject) => {
    const proc = spawn(
      process.execPath,
      ["../../scripts/prisma.mjs", ...args],
      {
        env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    proc.stdout.on("data", (data) => (output += data));
    proc.stderr.on("data", (data) => (output += data));
    proc.once("error", reject);
    proc.once("exit", (code) =>
      code === 0 ? resolve(output) : reject(new Error(output)),
    );
  });
}

const newUser = () =>
  db.user.create({
    data: { emailNormalized: `test-${++sequence}@example.com` },
  });

async function challenge(purpose: OtpPurpose = "RESET_PASSWORD") {
  const user = await newUser();
  const otp = await db.otpChallenge.create({
    data: {
      userId: user.id,
      emailNormalized: user.emailNormalized,
      purpose,
      codeHash: hash(randomUUID()),
      createdAt,
      sentAt: createdAt,
      expiresAt,
    },
  });
  return { user, otp };
}

before(async () => {
  lite = await PGlite.create();
  socket = new PGLiteSocketServer({
    db: lite,
    host: "127.0.0.1",
    port: 15436,
    maxConnections: 5,
  });
  await socket.start();
  // Exercise the exact Prisma 7 deploy command shipped to users.
  await prisma("migrate", "deploy");
  db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url, max: 1 }),
  });
});

after(async () => {
  await db?.$disconnect();
  await socket?.stop();
  await lite?.close();
});

test("Task 3: deploy từ DB trống, chạy lại không mất dữ liệu; status đã đồng bộ", async () => {
  const user = await newUser();
  const output = await prisma("migrate", "deploy");
  assert.match(output, /No pending migrations/);
  assert.ok(await db.user.findUnique({ where: { id: user.id } }));
  assert.match(await prisma("migrate", "status"), /up to date/);
});

test("Task 3: seed CLI chạy hai lần chỉ tạo 4 vai trò, không tạo user", async () => {
  const before = await db.user.count();
  await prisma("db", "seed");
  await prisma("db", "seed");
  await seedRoles(db);
  assert.equal(await db.role.count(), 4);
  assert.equal(await db.user.count(), before);
});

test("Task 3: email duy nhất, cấm email chưa chuẩn hóa", async () => {
  const user = await newUser();
  await assert.rejects(
    db.user.create({ data: { emailNormalized: user.emailNormalized } }),
  );
  for (const emailNormalized of [
    " User@Example.com",
    "USER@example.com",
    "no-at-sign",
  ]) {
    await assert.rejects(db.user.create({ data: { emailNormalized } }));
  }
});

test("Task 3: tài khoản mặc định pending, không tự có quyền; active cần xác minh", async () => {
  const user = await newUser();
  assert.equal(user.status, "PENDING_VERIFICATION");
  assert.equal(user.passwordHash, null);
  assert.equal(await db.userRole.count({ where: { userId: user.id } }), 0);
  await assert.rejects(
    db.user.update({ where: { id: user.id }, data: { status: "ACTIVE" } }),
  );
  await db.user.update({
    where: { id: user.id },
    data: { status: "ACTIVE", verifiedAt: usedAt },
  });
});

test("Task 3: profile/preference thuộc user, lưu nhiều sở thích, mặc định VN", async () => {
  const user = await db.user.create({
    data: {
      emailNormalized: `profile-${++sequence}@example.com`,
      profile: {
        create: { displayName: "Phan", birthDate: new Date("2004-01-15") },
      },
      preference: { create: { goal: "Phân loại rác", onboardingVersion: "1" } },
      interests: { create: [{ key: "recycle" }, { key: "reuse" }] },
    },
    include: { profile: true, preference: true, interests: true },
  });
  assert.equal(user.profile?.countryCode, "VN");
  assert.equal(user.preference?.timezone, "Asia/Ho_Chi_Minh");
  assert.equal(user.preference?.soundEnabled, true);
  assert.equal(user.preference?.remindersEnabled, false);
  assert.equal(user.interests.length, 2);
  await assert.rejects(
    db.profile.create({ data: { userId: user.id, displayName: "Bản trùng" } }),
  );
  await assert.rejects(
    db.profile.create({
      data: { userId: randomUUID(), displayName: "Mồ côi" },
    }),
  );
  await assert.rejects(
    db.userInterest.create({ data: { userId: user.id, key: "reuse" } }),
  );
  const persisted = await db.user.findUnique({
    where: { id: user.id },
    include: { preference: true },
  });
  assert.equal(persisted?.preference?.goal, "Phân loại rác");
});

test("Task 3: tạo user và profile trong transaction thất bại thì rollback", async () => {
  const emailNormalized = `rollback-${++sequence}@example.com`;
  await assert.rejects(
    db.user.create({
      data: { emailNormalized, profile: { create: { displayName: "   " } } },
    }),
  );
  assert.equal(await db.user.count({ where: { emailNormalized } }), 0);
});

test("Task 3: một danh tính provider không thể gắn hai tài khoản", async () => {
  const user = await newUser(),
    other = await newUser();
  await db.authIdentity.create({
    data: { userId: user.id, provider: "GOOGLE", providerSubject: "subject-1" },
  });
  await assert.rejects(
    db.authIdentity.create({
      data: {
        userId: other.id,
        provider: "GOOGLE",
        providerSubject: "subject-1",
      },
    }),
  );
});

test("Task 3: refresh có family/generation, hash duy nhất và giữ lịch sử token cũ", async () => {
  const user = await newUser();
  const session = await db.session.create({
    data: {
      userId: user.id,
      deviceName: "iPhone",
      createdAt,
      lastSeenAt: createdAt,
      expiresAt,
    },
  });
  const tokenHash = hash("refresh-0");
  const credential = await db.refreshCredential.create({
    data: { sessionId: session.id, tokenHash, createdAt, expiresAt },
  });
  await db.refreshCredential.update({
    where: { id: credential.id },
    data: { usedAt },
  });
  await db.refreshCredential.create({
    data: {
      sessionId: session.id,
      generation: 1,
      tokenHash: hash("refresh-1"),
      createdAt,
      expiresAt,
    },
  });
  await assert.rejects(
    db.refreshCredential.create({
      data: {
        sessionId: session.id,
        generation: 1,
        tokenHash: hash("refresh-2"),
        createdAt,
        expiresAt,
      },
    }),
  );
  await assert.rejects(
    db.refreshCredential.create({
      data: {
        sessionId: session.id,
        generation: 2,
        tokenHash,
        createdAt,
        expiresAt,
      },
    }),
  );
  assert.equal(
    await db.refreshCredential.count({ where: { sessionId: session.id } }),
    2,
  );
  await db.session.update({
    where: { id: session.id },
    data: { revokedAt: usedAt },
  });
  assert.ok(
    (await db.session.findUnique({ where: { id: session.id } }))?.revokedAt,
  );
});

test("Task 3: OTP giữ purpose/TTL/attempts; từ chối mã rõ và trạng thái thời gian sai", async () => {
  const { otp } = await challenge("REGISTER");
  assert.equal(otp.maxAttempts, 5);
  await assert.rejects(
    db.otpChallenge.update({ where: { id: otp.id }, data: { attempts: 6 } }),
  );
  await assert.rejects(
    db.otpChallenge.update({ where: { id: otp.id }, data: { attempts: -1 } }),
  );
  await assert.rejects(
    db.otpChallenge.update({
      where: { id: otp.id },
      data: { expiresAt: createdAt },
    }),
  );
  await assert.rejects(
    db.otpChallenge.update({
      where: { id: otp.id },
      data: { codeHash: "123456" },
    }),
  );
  await db.otpChallenge.update({
    where: { id: otp.id },
    data: { invalidatedAt: usedAt },
  });
  assert.ok(
    (await db.otpChallenge.findUnique({ where: { id: otp.id } }))
      ?.invalidatedAt,
  );
});

test("Task 3: cho phép challenge chưa gắn user phục vụ forgot password", async () => {
  const otp = await db.otpChallenge.create({
    data: {
      emailNormalized: "unknown@example.com",
      purpose: "RESET_PASSWORD",
      codeHash: hash("unknown"),
      createdAt,
      sentAt: createdAt,
      expiresAt,
    },
  });
  assert.equal(otp.userId, null);
});

test("Task 3: grant phải thuộc đúng user và challenge reset, không tái dùng challenge", async () => {
  const { user, otp } = await challenge();
  const other = await newUser();
  const base = { challengeId: otp.id, createdAt, expiresAt };
  await assert.rejects(
    db.resetGrant.create({
      data: { ...base, userId: other.id, tokenHash: hash("wrong-owner") },
    }),
  );
  const register = await challenge("REGISTER");
  await assert.rejects(
    db.resetGrant.create({
      data: {
        ...base,
        challengeId: register.otp.id,
        userId: register.user.id,
        tokenHash: hash("wrong-purpose"),
      },
    }),
  );
  await assert.rejects(
    db.resetGrant.create({
      data: {
        ...base,
        challengeId: register.otp.id,
        userId: register.user.id,
        purpose: "REGISTER",
        tokenHash: hash("purpose-bypass"),
      },
    }),
  );
  await db.resetGrant.create({
    data: { ...base, userId: user.id, tokenHash: hash("valid-grant") },
  });
  await assert.rejects(
    db.resetGrant.create({
      data: { ...base, userId: user.id, tokenHash: hash("duplicate-grant") },
    }),
  );
});

test("Task 3: schema hỗ trợ tiêu thụ grant bằng cập nhật có điều kiện một lần", async () => {
  const { user, otp } = await challenge();
  const grant = await db.resetGrant.create({
    data: {
      userId: user.id,
      challengeId: otp.id,
      tokenHash: hash("consume"),
      createdAt,
      expiresAt,
    },
  });
  const consume = () =>
    db.resetGrant.updateMany({
      where: { id: grant.id, usedAt: null, expiresAt: { gt: usedAt } },
      data: { usedAt },
    });
  assert.equal((await consume()).count, 1);
  assert.equal((await consume()).count, 0);
  // This tests the persistence primitive, not an implemented reset endpoint.
});

test("Task 3: khóa ngoại role tồn tại, không cấp trùng vai trò", async () => {
  const user = await newUser();
  await db.userRole.create({ data: { userId: user.id, roleCode: "USER" } });
  await assert.rejects(
    db.userRole.create({ data: { userId: user.id, roleCode: "USER" } }),
  );
  await assert.rejects(db.role.delete({ where: { code: "USER" } }));
});

test("Task 3: xóa media bỏ liên kết avatar; xóa user dọn dữ liệu nhưng giữ audit", async () => {
  const { user, otp } = await challenge();
  const media = await db.media.create({
    data: {
      ownerId: user.id,
      storageKey: randomUUID(),
      mimeType: "image/png",
      sizeBytes: 100,
    },
  });
  await db.profile.create({
    data: { userId: user.id, displayName: "Phan", avatarId: media.id },
  });
  await db.userPreference.create({ data: { userId: user.id } });
  await db.userInterest.create({ data: { userId: user.id, key: "reuse" } });
  await db.userRole.create({ data: { userId: user.id, roleCode: "USER" } });
  await db.authIdentity.create({
    data: {
      userId: user.id,
      provider: "FACEBOOK",
      providerSubject: randomUUID(),
    },
  });
  const session = await db.session.create({
    data: {
      userId: user.id,
      deviceName: "Test",
      createdAt,
      lastSeenAt: createdAt,
      expiresAt,
    },
  });
  await db.refreshCredential.create({
    data: {
      sessionId: session.id,
      tokenHash: hash(randomUUID()),
      createdAt,
      expiresAt,
    },
  });
  await db.resetGrant.create({
    data: {
      userId: user.id,
      challengeId: otp.id,
      tokenHash: hash(randomUUID()),
      createdAt,
      expiresAt,
    },
  });
  const audit = await db.auditLog.create({
    data: { actorId: user.id, action: "TEST_RECORD" },
  });
  await db.media.delete({ where: { id: media.id } });
  assert.equal(
    (await db.profile.findUnique({ where: { userId: user.id } }))?.avatarId,
    null,
  );
  await db.user.delete({ where: { id: user.id } });
  const where = { userId: user.id };
  const counts = await Promise.all([
    db.profile.count({ where }),
    db.userPreference.count({ where }),
    db.userInterest.count({ where }),
    db.authIdentity.count({ where }),
    db.session.count({ where }),
    db.otpChallenge.count({ where }),
    db.resetGrant.count({ where }),
    db.userRole.count({ where }),
  ]);
  for (const count of counts) {
    assert.equal(count, 0);
  }
  assert.equal(
    await db.refreshCredential.count({ where: { sessionId: session.id } }),
    0,
  );
  assert.equal(
    (await db.auditLog.findUnique({ where: { id: audit.id } }))?.actorId,
    null,
  );
});
