-- Existing opaque refresh tokens cannot be safely converted to signed JWT identifiers.
DELETE FROM "auth_sessions";

-- AlterTable
ALTER TABLE "auth_sessions"
DROP COLUMN "refresh_token",
ADD COLUMN "jti" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_jti_key" ON "auth_sessions"("jti");
