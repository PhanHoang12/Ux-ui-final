BEGIN;
ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMPTZ(3);
ALTER TABLE "Session" ADD COLUMN "accessTokenHash" CHAR(64), ADD COLUMN "accessExpiresAt" TIMESTAMPTZ(3);
CREATE UNIQUE INDEX "Session_accessTokenHash_key" ON "Session"("accessTokenHash");
ALTER TABLE "Session" ADD CONSTRAINT "Session_access_pair_check" CHECK (
  ("accessTokenHash" IS NULL AND "accessExpiresAt" IS NULL)
  OR ("accessTokenHash" IS NOT NULL AND "accessTokenHash" ~ '^[0-9a-f]{64}$' AND "accessExpiresAt" IS NOT NULL AND "accessExpiresAt" > "createdAt" AND "accessExpiresAt" <= "expiresAt")
);
CREATE TABLE "AuthThrottle" (
  "key" CHAR(64) NOT NULL PRIMARY KEY,
  "count" INTEGER NOT NULL DEFAULT 1 CHECK ("count" > 0),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "AuthThrottle_expiresAt_idx" ON "AuthThrottle"("expiresAt");
COMMIT;
