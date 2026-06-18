-- CreateEnum
CREATE TYPE "WorkspaceMemberRole" AS ENUM ('OWNER', 'MEMBER');

-- AlterTable
ALTER TABLE "workspace_members"
ALTER COLUMN "role" DROP DEFAULT,
ALTER COLUMN "role" TYPE "WorkspaceMemberRole"
USING ("role"::text::"WorkspaceMemberRole"),
ALTER COLUMN "role" SET DEFAULT 'OWNER';
