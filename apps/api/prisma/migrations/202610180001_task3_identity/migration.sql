-- Task 3 is the first business migration. Task 2 created no application tables.
-- Apply atomically; never reset or drop an existing database.
BEGIN;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTER', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "IdentityProvider" AS ENUM ('GOOGLE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('USER', 'ORGANIZER', 'COLLECTOR', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "emailNormalized" VARCHAR(254) NOT NULL,
    "passwordHash" VARCHAR(255),
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "verifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "userId" UUID NOT NULL,
    "displayName" VARCHAR(100) NOT NULL,
    "birthDate" DATE,
    "countryCode" CHAR(2) NOT NULL DEFAULT 'VN',
    "avatarId" UUID,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "userId" UUID NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "locale" VARCHAR(16) NOT NULL DEFAULT 'vi',
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "vibrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "goal" VARCHAR(200),
    "onboardingVersion" VARCHAR(32),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserInterest" (
    "userId" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,

    CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("userId","key")
);

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "IdentityProvider" NOT NULL,
    "providerSubject" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deviceName" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshCredential" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "generation" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),

    CONSTRAINT "RefreshCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "emailNormalized" VARCHAR(254) NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "codeHash" CHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "invalidatedAt" TIMESTAMPTZ(3),

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResetGrant" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "challengeId" UUID NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'RESET_PASSWORD',
    "tokenHash" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ResetGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "code" "RoleCode" NOT NULL,
    "name" VARCHAR(80) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" UUID NOT NULL,
    "roleCode" "RoleCode" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleCode")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "storageKey" VARCHAR(512) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(120) NOT NULL,
    "targetType" VARCHAR(80),
    "targetId" VARCHAR(100),
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_emailNormalized_key" ON "User"("emailNormalized");

-- CreateIndex
CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_avatarId_key" ON "Profile"("avatarId");

-- CreateIndex
CREATE INDEX "AuthIdentity_userId_idx" ON "AuthIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_providerSubject_key" ON "AuthIdentity"("provider", "providerSubject");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_createdAt_idx" ON "Session"("userId", "revokedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshCredential_tokenHash_key" ON "RefreshCredential"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshCredential_expiresAt_idx" ON "RefreshCredential"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshCredential_sessionId_generation_key" ON "RefreshCredential"("sessionId", "generation");

-- CreateIndex
CREATE INDEX "OtpChallenge_emailNormalized_purpose_sentAt_idx" ON "OtpChallenge"("emailNormalized", "purpose", "sentAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_userId_idx" ON "OtpChallenge"("userId");

-- CreateIndex
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OtpChallenge_id_userId_purpose_key" ON "OtpChallenge"("id", "userId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "ResetGrant_challengeId_key" ON "ResetGrant"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "ResetGrant_tokenHash_key" ON "ResetGrant"("tokenHash");

-- CreateIndex
CREATE INDEX "ResetGrant_userId_idx" ON "ResetGrant"("userId");

-- CreateIndex
CREATE INDEX "ResetGrant_expiresAt_idx" ON "ResetGrant"("expiresAt");

-- CreateIndex
CREATE INDEX "UserRole_roleCode_idx" ON "UserRole"("roleCode");

-- CreateIndex
CREATE UNIQUE INDEX "Media_storageKey_key" ON "Media"("storageKey");

-- CreateIndex
CREATE INDEX "Media_ownerId_createdAt_idx" ON "Media"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshCredential" ADD CONSTRAINT "RefreshCredential_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResetGrant" ADD CONSTRAINT "ResetGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResetGrant" ADD CONSTRAINT "ResetGrant_challengeId_userId_purpose_fkey" FOREIGN KEY ("challengeId", "userId", "purpose") REFERENCES "OtpChallenge"("id", "userId", "purpose") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Role"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PostgreSQL checks are deliberately kept in migration SQL because Prisma 7
-- cannot express them in schema.prisma. Keep these when planning later migrations.
ALTER TABLE "User" ADD CONSTRAINT "User_email_normalized_check" CHECK (
  "emailNormalized" = lower(btrim("emailNormalized"))
  AND "emailNormalized" ~ '^[^[:space:]@]+@[^[:space:]@]+$'
);
ALTER TABLE "User" ADD CONSTRAINT "User_active_verified_check" CHECK (
  "status" <> 'ACTIVE' OR "verifiedAt" IS NOT NULL
);
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_display_name_check" CHECK (length(btrim("displayName")) > 0);
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_country_check" CHECK ("countryCode" ~ '^[A-Z]{2}$');
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_key_check" CHECK ("key" ~ '^[a-z][a-z0-9_]{0,63}$');
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_subject_check" CHECK (length(btrim("providerSubject")) > 0);
ALTER TABLE "Session" ADD CONSTRAINT "Session_time_check" CHECK (
  "expiresAt" > "createdAt" AND "lastSeenAt" >= "createdAt"
  AND ("revokedAt" IS NULL OR "revokedAt" >= "createdAt")
);
ALTER TABLE "RefreshCredential" ADD CONSTRAINT "RefreshCredential_hash_check" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "RefreshCredential" ADD CONSTRAINT "RefreshCredential_generation_check" CHECK ("generation" >= 0);
ALTER TABLE "RefreshCredential" ADD CONSTRAINT "RefreshCredential_time_check" CHECK (
  "expiresAt" > "createdAt"
  AND ("usedAt" IS NULL OR ("usedAt" >= "createdAt" AND "usedAt" <= "expiresAt"))
);
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_email_normalized_check" CHECK (
  "emailNormalized" = lower(btrim("emailNormalized"))
  AND "emailNormalized" ~ '^[^[:space:]@]+@[^[:space:]@]+$'
);
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_hash_check" CHECK ("codeHash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_attempts_check" CHECK (
  "maxAttempts" > 0 AND "attempts" >= 0 AND "attempts" <= "maxAttempts"
);
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_time_check" CHECK (
  "sentAt" >= "createdAt" AND "expiresAt" > "sentAt"
  AND ("consumedAt" IS NULL OR ("consumedAt" >= "sentAt" AND "consumedAt" <= "expiresAt"))
  AND ("invalidatedAt" IS NULL OR "invalidatedAt" >= "createdAt")
);
ALTER TABLE "ResetGrant" ADD CONSTRAINT "ResetGrant_purpose_check" CHECK ("purpose" = 'RESET_PASSWORD');
ALTER TABLE "ResetGrant" ADD CONSTRAINT "ResetGrant_hash_check" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "ResetGrant" ADD CONSTRAINT "ResetGrant_time_check" CHECK (
  "expiresAt" > "createdAt"
  AND ("usedAt" IS NULL OR ("usedAt" >= "createdAt" AND "usedAt" <= "expiresAt"))
);
ALTER TABLE "Media" ADD CONSTRAINT "Media_size_check" CHECK ("sizeBytes" > 0);
ALTER TABLE "Media" ADD CONSTRAINT "Media_storage_key_check" CHECK (length(btrim("storageKey")) > 0);
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_action_check" CHECK (length(btrim("action")) > 0);

COMMIT;
