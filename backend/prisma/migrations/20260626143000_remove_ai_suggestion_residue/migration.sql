/*
  Warnings:

  - The values [GENERATE_AI_SUGGESTIONS,GENERATE_SUGGESTIONS] on the enum `JobType` will be removed.
  - The value [GENERATING_SUGGESTIONS] on the enum `JobStatus` will be removed.
  - If any processing job still uses these legacy values, this migration will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "JobType_new" AS ENUM ('TRANSCRIBE', 'GENERATE_SUBTITLE', 'GENERATE_CHAPTERS', 'GENERATE_SHORT_CLIPS', 'EXPORT_RENDER', 'BURN_SUBTITLE', 'PUBLISH', 'GENERATE_THUMBNAIL', 'GENERATE_THUMBNAIL_SPRITE', 'GENERATE_WAVEFORM_PEAK');
ALTER TABLE "processing_jobs" ALTER COLUMN "job_type" TYPE "JobType_new" USING ("job_type"::text::"JobType_new");
ALTER TYPE "JobType" RENAME TO "JobType_old";
ALTER TYPE "JobType_new" RENAME TO "JobType";
DROP TYPE "public"."JobType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "JobStatus_new" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'TRANSCRIBING', 'GENERATING_SUBTITLE', 'BURNING_SUBTITLE', 'GENERATING_CHAPTERS', 'GENERATING_SHORT_CLIPS', 'GENERATING_MEDIA_PREVIEW', 'PUBLISHING', 'COMPLETED', 'FAILED', 'CANCELED');
ALTER TABLE "processing_jobs" ALTER COLUMN "status" TYPE "JobStatus_new" USING ("status"::text::"JobStatus_new");
ALTER TYPE "JobStatus" RENAME TO "JobStatus_old";
ALTER TYPE "JobStatus_new" RENAME TO "JobStatus";
DROP TYPE "public"."JobStatus_old";
COMMIT;

-- DropEnum
DROP TYPE "public"."SuggestionType";

-- DropEnum
DROP TYPE "public"."TargetType";
