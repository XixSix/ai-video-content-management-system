-- AlterTable
ALTER TABLE "project_media"
DROP COLUMN "display_name",
DROP COLUMN "start_time",
DROP COLUMN "duration",
DROP COLUMN "metadata",
ALTER COLUMN "role" DROP DEFAULT;

-- DropIndex
DROP INDEX "project_media_project_id_media_id_role_idx";

-- CreateIndex
CREATE UNIQUE INDEX "project_media_project_id_media_id_role_key"
ON "project_media"("project_id", "media_id", "role");
