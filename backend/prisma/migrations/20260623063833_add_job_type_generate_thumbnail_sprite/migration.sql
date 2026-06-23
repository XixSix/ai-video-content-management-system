/*
  Warnings:

  - The values [RENDER_EXPORT,MEDIA_TRANSCODE,THUMBNAIL_GENERATION,WAVEFORM_PEAK_GENERATION] on the enum `JobType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
ALTER TYPE "AssetType" ADD VALUE 'THUMBNAIL_SPRITE';

-- AlterEnum
BEGIN;
CREATE TYPE "JobType_new" AS ENUM ('TRANSCRIBE', 'GENERATE_SUBTITLE', 'GENERATE_CHAPTERS', 'GENERATE_SHORT_CLIPS', 'GENERATE_AI_SUGGESTIONS', 'GENERATE_SUGGESTIONS', 'EXPORT_RENDER', 'BURN_SUBTITLE', 'PUBLISH', 'GENERATE_THUMBNAIL', 'GENERATE_THUMBNAIL_SPRITE', 'GENERATE_WAVEFORM_PEAK');
ALTER TABLE "processing_jobs" ALTER COLUMN "job_type" TYPE "JobType_new" USING ("job_type"::text::"JobType_new");
ALTER TYPE "JobType" RENAME TO "JobType_old";
ALTER TYPE "JobType_new" RENAME TO "JobType";
DROP TYPE "public"."JobType_old";
COMMIT;
