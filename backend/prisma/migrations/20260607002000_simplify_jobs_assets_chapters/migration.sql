-- CreateEnum
CREATE TYPE "AsrModel" AS ENUM ('FASTER-WHISPER', 'WHISPER');

-- CreateEnum
CREATE TYPE "ModelSize" AS ENUM (
  'large-v3',
  'large-v3-turbo',
  'MEDIUM',
  'medium.en',
  'SMALL',
  'small.en',
  'BASE',
  'base.en',
  'TINY',
  'tiny.en'
);

-- Add chapter edit/version state before mapping USER_EDITED source away.
ALTER TABLE "video_chapters"
ADD COLUMN "is_edited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Preserve ASR metadata before dropping the free-form model column.
ALTER TABLE "transcripts"
ADD COLUMN "asr_model" "AsrModel",
ADD COLUMN "model_size" "ModelSize";

UPDATE "transcripts"
SET "asr_model" = CASE
  WHEN lower(COALESCE("model", '')) LIKE '%whisper%' THEN 'FASTER-WHISPER'::"AsrModel"
  ELSE NULL
END;

UPDATE "transcripts"
SET "model_size" = CASE
  WHEN lower(COALESCE("model", '')) LIKE '%large-v3-turbo%' THEN 'large-v3-turbo'::"ModelSize"
  WHEN lower(COALESCE("model", '')) LIKE '%large-v3%' THEN 'large-v3'::"ModelSize"
  WHEN lower(COALESCE("model", '')) LIKE '%medium.en%' THEN 'medium.en'::"ModelSize"
  WHEN lower(COALESCE("model", '')) LIKE '%medium%' THEN 'MEDIUM'::"ModelSize"
  WHEN lower(COALESCE("model", '')) LIKE '%small.en%' THEN 'small.en'::"ModelSize"
  WHEN lower(COALESCE("model", '')) LIKE '%small%' THEN 'SMALL'::"ModelSize"
  WHEN lower(COALESCE("model", '')) LIKE '%base.en%' THEN 'base.en'::"ModelSize"
  WHEN lower(COALESCE("model", '')) LIKE '%base%' THEN 'BASE'::"ModelSize"
  WHEN lower(COALESCE("model", '')) LIKE '%tiny.en%' THEN 'tiny.en'::"ModelSize"
  WHEN lower(COALESCE("model", '')) LIKE '%tiny%' THEN 'TINY'::"ModelSize"
  ELSE NULL
END;

-- Map existing values before replacing enums with reduced variants.
DELETE FROM "generated_assets"
WHERE "asset_type" = 'THUMBNAIL';

UPDATE "video_chapters"
SET "is_edited" = true
WHERE "source" = 'USER_EDITED';

-- AlterEnum
BEGIN;
CREATE TYPE "AssetType_new" AS ENUM ('SUBTITLE_SRT', 'SUBTITLE_VTT', 'BURNED_SUBTITLE_VIDEO');
ALTER TABLE "generated_assets" ALTER COLUMN "asset_type" TYPE "AssetType_new" USING ("asset_type"::text::"AssetType_new");
ALTER TYPE "AssetType" RENAME TO "AssetType_old";
ALTER TYPE "AssetType_new" RENAME TO "AssetType";
DROP TYPE "public"."AssetType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ChapterSource_new" AS ENUM ('IMPORTED', 'WORDS', 'SEGMENTS');
ALTER TABLE "public"."video_chapters" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "video_chapters" ALTER COLUMN "source" TYPE "ChapterSource_new"
USING (
  CASE
    WHEN "source"::text = 'IMPORTED' THEN 'IMPORTED'
    ELSE 'SEGMENTS'
  END
)::"ChapterSource_new";
ALTER TYPE "ChapterSource" RENAME TO "ChapterSource_old";
ALTER TYPE "ChapterSource_new" RENAME TO "ChapterSource";
DROP TYPE "public"."ChapterSource_old";
ALTER TABLE "video_chapters" ALTER COLUMN "source" SET DEFAULT 'SEGMENTS';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "JobStatus_new" AS ENUM ('PENDING', 'QUEUED', 'TRANSCRIBING', 'GENERATING_SUBTITLE', 'BURNING_SUBTITLE', 'GENERATING_CHAPTERS', 'GENERATING_SHORT_CLIPS', 'GENERATING_SUGGESTIONS', 'PUBLISHING', 'COMPLETED', 'FAILED');
ALTER TABLE "public"."processing_jobs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "processing_jobs" ALTER COLUMN "status" TYPE "JobStatus_new"
USING (
  CASE
    WHEN "status"::text IN ('EXTRACTING_AUDIO', 'PREPROCESSING_TRANSCRIPT') THEN 'TRANSCRIBING'
    WHEN "status"::text IN (
      'GENERATING_CLIP_CANDIDATES',
      'DEDUPLICATING_CANDIDATES',
      'SCORING_SALIENCY',
      'SCORING_HIGHLIGHTS',
      'FILTERING_DIVERSITY',
      'SELECTING_CLIPS',
      'CUTTING_VIDEO',
      'CONVERTING_ASPECT_RATIO'
    ) THEN 'GENERATING_SHORT_CLIPS'
    ELSE "status"::text
  END
)::"JobStatus_new";
ALTER TYPE "JobStatus" RENAME TO "JobStatus_old";
ALTER TYPE "JobStatus_new" RENAME TO "JobStatus";
DROP TYPE "public"."JobStatus_old";
ALTER TABLE "processing_jobs" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "JobType_new" AS ENUM ('TRANSCRIBE', 'GENERATE_SUBTITLE', 'GENERATE_CHAPTERS', 'GENERATE_SHORT_CLIPS', 'GENERATE_SUGGESTIONS', 'BURN_SUBTITLE', 'PUBLISH');
ALTER TABLE "processing_jobs" ALTER COLUMN "job_type" TYPE "JobType_new"
USING (
  CASE
    WHEN "job_type"::text = 'GENERATE_AI_SUGGESTIONS' THEN 'GENERATE_SUGGESTIONS'
    ELSE "job_type"::text
  END
)::"JobType_new";
ALTER TYPE "JobType" RENAME TO "JobType_old";
ALTER TYPE "JobType_new" RENAME TO "JobType";
DROP TYPE "public"."JobType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "generated_assets" DROP CONSTRAINT "generated_assets_media_id_fkey";

-- DropIndex
DROP INDEX "generated_assets_media_id_idx";

-- AlterTable
ALTER TABLE "generated_assets" DROP COLUMN "media_id";

-- AlterTable
ALTER TABLE "processing_jobs" DROP COLUMN "current_step";

-- AlterTable
ALTER TABLE "transcripts" DROP COLUMN "model";

-- AlterTable
ALTER TABLE "video_chapters"
DROP COLUMN "summary",
ALTER COLUMN "source" SET DEFAULT 'SEGMENTS';
