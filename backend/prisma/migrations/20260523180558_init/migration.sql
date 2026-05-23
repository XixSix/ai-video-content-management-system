-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('VIDEO', 'IMAGE');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('UPLOADING', 'UPLOADED', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('TRANSCRIBE', 'GENERATE_SUBTITLE', 'GENERATE_CHAPTERS', 'GENERATE_SHORT_CLIPS', 'GENERATE_AI_SUGGESTIONS', 'BURN_SUBTITLE', 'PUBLISH');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'QUEUED', 'EXTRACTING_AUDIO', 'TRANSCRIBING', 'PREPROCESSING_TRANSCRIPT', 'GENERATING_SUBTITLE', 'BURNING_SUBTITLE', 'GENERATING_CHAPTERS', 'GENERATING_CLIP_CANDIDATES', 'DEDUPLICATING_CANDIDATES', 'SCORING_SALIENCY', 'SCORING_HIGHLIGHTS', 'FILTERING_DIVERSITY', 'SELECTING_CLIPS', 'CUTTING_VIDEO', 'CONVERTING_ASPECT_RATIO', 'GENERATING_SUGGESTIONS', 'PUBLISHING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TranscriptSource" AS ENUM ('FASTER_WHISPER', 'WHISPER', 'IMPORTED', 'USER_EDITED');

-- CreateEnum
CREATE TYPE "ChapterSource" AS ENUM ('RULE_BASED', 'LLM', 'USER_EDITED');

-- CreateEnum
CREATE TYPE "ClipCandidateStatus" AS ENUM ('CANDIDATE', 'SELECTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ShortClipStatus" AS ENUM ('PENDING', 'RENDERING', 'READY', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('ORIGINAL_MEDIA', 'THUMBNAIL', 'SUBTITLE_SRT', 'SUBTITLE_VTT', 'BURNED_SUBTITLE_VIDEO');

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('MEDIA', 'VIDEO_CHAPTER', 'SHORT_CLIP', 'PUBLISH_TASK');

-- CreateEnum
CREATE TYPE "SuggestionType" AS ENUM ('TITLE', 'CAPTION', 'HASHTAG', 'DESCRIPTION', 'PLATFORM_CONTENT');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('YOUTUBE', 'TIKTOK', 'FACEBOOK', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "PlatformAccountStatus" AS ENUM ('CONNECTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" VARCHAR(255),
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" VARCHAR(100),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "MediaType" NOT NULL,
    "title" VARCHAR(255),
    "description" TEXT,
    "original_filename" VARCHAR(255) NOT NULL,
    "s3_bucket" VARCHAR(255) NOT NULL,
    "s3_key" TEXT NOT NULL,
    "s3_region" VARCHAR(100),
    "s3_etag" VARCHAR(255),
    "upload_id" TEXT,
    "duration" DOUBLE PRECISION,
    "file_size_bytes" BIGINT,
    "mime_type" VARCHAR(100),
    "width" INTEGER,
    "height" INTEGER,
    "status" "MediaStatus" NOT NULL DEFAULT 'UPLOADED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_jobs" (
    "id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "job_type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER DEFAULT 0,
    "current_step" VARCHAR(255),
    "error_message" TEXT,
    "queue_name" VARCHAR(100),
    "task_name" VARCHAR(100),
    "external_task_id" VARCHAR(255),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "input" JSONB,
    "output" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcripts" (
    "id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "job_id" UUID,
    "language" VARCHAR(20),
    "source" "TranscriptSource" NOT NULL DEFAULT 'FASTER_WHISPER',
    "model" VARCHAR(100),
    "full_text" TEXT,
    "content" JSONB,
    "transcript_quality_score" DOUBLE PRECISION,
    "filler_ratio" DOUBLE PRECISION,
    "unique_word_ratio" DOUBLE PRECISION,
    "speech_density" DOUBLE PRECISION,
    "word_count" INTEGER,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "full_text_dirty" BOOLEAN NOT NULL DEFAULT false,
    "full_text_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_segments" (
    "id" UUID NOT NULL,
    "transcript_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "segment_index" INTEGER NOT NULL,
    "start_time" DOUBLE PRECISION NOT NULL,
    "end_time" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,
    "clean_text" TEXT,
    "confidence" DOUBLE PRECISION,
    "speaker_label" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcript_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_chapters" (
    "id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "transcript_id" UUID NOT NULL,
    "job_id" UUID,
    "chapter_index" INTEGER NOT NULL,
    "start_time" DOUBLE PRECISION NOT NULL,
    "end_time" DOUBLE PRECISION NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "summary" TEXT,
    "transcript_version" INTEGER NOT NULL,
    "source" "ChapterSource" NOT NULL DEFAULT 'LLM',
    "score" DOUBLE PRECISION,
    "boundary_score" DOUBLE PRECISION,
    "pause_score" DOUBLE PRECISION,
    "discourse_marker_score" DOUBLE PRECISION,
    "semantic_shift_score" DOUBLE PRECISION,
    "duration_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clip_candidates" (
    "id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "transcript_id" UUID NOT NULL,
    "chapter_id" UUID,
    "job_id" UUID,
    "start_time" DOUBLE PRECISION NOT NULL,
    "end_time" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "transcript_version" INTEGER NOT NULL,
    "text" TEXT,
    "clean_text" TEXT,
    "hook_score" DOUBLE PRECISION,
    "question_score" DOUBLE PRECISION,
    "keyword_score" DOUBLE PRECISION,
    "duration_score" DOUBLE PRECISION,
    "speech_density_score" DOUBLE PRECISION,
    "saliency_score" DOUBLE PRECISION,
    "completeness_score" DOUBLE PRECISION,
    "emotion_score" DOUBLE PRECISION,
    "final_score" DOUBLE PRECISION,
    "llm_score" DOUBLE PRECISION,
    "llm_reason" TEXT,
    "dedup_group_id" VARCHAR(100),
    "metadata" JSONB,
    "status" "ClipCandidateStatus" NOT NULL DEFAULT 'CANDIDATE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clip_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_clips" (
    "id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "transcript_id" UUID,
    "chapter_id" UUID,
    "candidate_id" UUID,
    "title" VARCHAR(255),
    "caption" TEXT,
    "description" TEXT,
    "hashtags" JSONB,
    "start_time" DOUBLE PRECISION NOT NULL,
    "end_time" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "transcript_version" INTEGER,
    "score" DOUBLE PRECISION,
    "reason" TEXT,
    "video_path" TEXT,
    "thumbnail_path" TEXT,
    "subtitle_path" TEXT,
    "aspect_ratio" VARCHAR(20),
    "status" "ShortClipStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "short_clips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_assets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "transcript_id" UUID,
    "chapter_id" UUID,
    "asset_type" "AssetType" NOT NULL,
    "transcript_version" INTEGER,
    "s3_bucket" VARCHAR(255) NOT NULL,
    "s3_key" TEXT NOT NULL,
    "s3_region" VARCHAR(100),
    "s3_etag" VARCHAR(255),
    "mime_type" VARCHAR(100),
    "file_size_bytes" BIGINT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_suggestions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "target_type" "TargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "suggestion_type" "SuggestionType" NOT NULL,
    "platform" "Platform",
    "content" JSONB NOT NULL,
    "model" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "account_name" VARCHAR(255),
    "platform_user_id" VARCHAR(255),
    "access_token_encrypted" TEXT,
    "refresh_token_encrypted" TEXT,
    "token_last4" VARCHAR(10),
    "expires_at" TIMESTAMP(3),
    "status" "PlatformAccountStatus" NOT NULL DEFAULT 'CONNECTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_tasks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "media_id" UUID,
    "short_clip_id" UUID,
    "platform_account_id" UUID,
    "job_id" UUID,
    "platform" "Platform" NOT NULL,
    "title" TEXT,
    "caption" TEXT,
    "description" TEXT,
    "hashtags" JSONB,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "platform_post_id" TEXT,
    "platform_post_url" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publish_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_key" ON "auth_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "auth_sessions_revoked_at_idx" ON "auth_sessions"("revoked_at");

-- CreateIndex
CREATE INDEX "media_user_id_idx" ON "media"("user_id");

-- CreateIndex
CREATE INDEX "media_status_idx" ON "media"("status");

-- CreateIndex
CREATE INDEX "media_type_idx" ON "media"("type");

-- CreateIndex
CREATE UNIQUE INDEX "media_s3_bucket_s3_key_key" ON "media"("s3_bucket", "s3_key");

-- CreateIndex
CREATE INDEX "processing_jobs_user_id_idx" ON "processing_jobs"("user_id");

-- CreateIndex
CREATE INDEX "processing_jobs_media_id_idx" ON "processing_jobs"("media_id");

-- CreateIndex
CREATE INDEX "processing_jobs_job_type_idx" ON "processing_jobs"("job_type");

-- CreateIndex
CREATE INDEX "processing_jobs_status_idx" ON "processing_jobs"("status");

-- CreateIndex
CREATE INDEX "transcripts_media_id_idx" ON "transcripts"("media_id");

-- CreateIndex
CREATE INDEX "transcripts_job_id_idx" ON "transcripts"("job_id");

-- CreateIndex
CREATE INDEX "transcripts_source_idx" ON "transcripts"("source");

-- CreateIndex
CREATE INDEX "transcript_segments_transcript_id_idx" ON "transcript_segments"("transcript_id");

-- CreateIndex
CREATE INDEX "transcript_segments_media_id_idx" ON "transcript_segments"("media_id");

-- CreateIndex
CREATE INDEX "transcript_segments_start_time_end_time_idx" ON "transcript_segments"("start_time", "end_time");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_segments_transcript_id_segment_index_key" ON "transcript_segments"("transcript_id", "segment_index");

-- CreateIndex
CREATE INDEX "video_chapters_media_id_idx" ON "video_chapters"("media_id");

-- CreateIndex
CREATE INDEX "video_chapters_transcript_id_idx" ON "video_chapters"("transcript_id");

-- CreateIndex
CREATE INDEX "video_chapters_job_id_idx" ON "video_chapters"("job_id");

-- CreateIndex
CREATE INDEX "video_chapters_start_time_end_time_idx" ON "video_chapters"("start_time", "end_time");

-- CreateIndex
CREATE UNIQUE INDEX "video_chapters_transcript_id_chapter_index_key" ON "video_chapters"("transcript_id", "chapter_index");

-- CreateIndex
CREATE INDEX "clip_candidates_media_id_idx" ON "clip_candidates"("media_id");

-- CreateIndex
CREATE INDEX "clip_candidates_transcript_id_idx" ON "clip_candidates"("transcript_id");

-- CreateIndex
CREATE INDEX "clip_candidates_chapter_id_idx" ON "clip_candidates"("chapter_id");

-- CreateIndex
CREATE INDEX "clip_candidates_job_id_idx" ON "clip_candidates"("job_id");

-- CreateIndex
CREATE INDEX "clip_candidates_status_idx" ON "clip_candidates"("status");

-- CreateIndex
CREATE INDEX "clip_candidates_final_score_idx" ON "clip_candidates"("final_score");

-- CreateIndex
CREATE INDEX "clip_candidates_start_time_end_time_idx" ON "clip_candidates"("start_time", "end_time");

-- CreateIndex
CREATE INDEX "short_clips_media_id_idx" ON "short_clips"("media_id");

-- CreateIndex
CREATE INDEX "short_clips_user_id_idx" ON "short_clips"("user_id");

-- CreateIndex
CREATE INDEX "short_clips_transcript_id_idx" ON "short_clips"("transcript_id");

-- CreateIndex
CREATE INDEX "short_clips_chapter_id_idx" ON "short_clips"("chapter_id");

-- CreateIndex
CREATE INDEX "short_clips_candidate_id_idx" ON "short_clips"("candidate_id");

-- CreateIndex
CREATE INDEX "short_clips_status_idx" ON "short_clips"("status");

-- CreateIndex
CREATE INDEX "generated_assets_user_id_idx" ON "generated_assets"("user_id");

-- CreateIndex
CREATE INDEX "generated_assets_media_id_idx" ON "generated_assets"("media_id");

-- CreateIndex
CREATE INDEX "generated_assets_transcript_id_idx" ON "generated_assets"("transcript_id");

-- CreateIndex
CREATE INDEX "generated_assets_chapter_id_idx" ON "generated_assets"("chapter_id");

-- CreateIndex
CREATE INDEX "generated_assets_asset_type_idx" ON "generated_assets"("asset_type");

-- CreateIndex
CREATE UNIQUE INDEX "generated_assets_s3_bucket_s3_key_key" ON "generated_assets"("s3_bucket", "s3_key");

-- CreateIndex
CREATE INDEX "ai_suggestions_user_id_idx" ON "ai_suggestions"("user_id");

-- CreateIndex
CREATE INDEX "ai_suggestions_target_type_target_id_idx" ON "ai_suggestions"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "ai_suggestions_suggestion_type_idx" ON "ai_suggestions"("suggestion_type");

-- CreateIndex
CREATE INDEX "ai_suggestions_platform_idx" ON "ai_suggestions"("platform");

-- CreateIndex
CREATE INDEX "platform_accounts_user_id_idx" ON "platform_accounts"("user_id");

-- CreateIndex
CREATE INDEX "platform_accounts_platform_idx" ON "platform_accounts"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "platform_accounts_user_id_platform_key" ON "platform_accounts"("user_id", "platform");

-- CreateIndex
CREATE INDEX "publish_tasks_user_id_idx" ON "publish_tasks"("user_id");

-- CreateIndex
CREATE INDEX "publish_tasks_media_id_idx" ON "publish_tasks"("media_id");

-- CreateIndex
CREATE INDEX "publish_tasks_short_clip_id_idx" ON "publish_tasks"("short_clip_id");

-- CreateIndex
CREATE INDEX "publish_tasks_platform_account_id_idx" ON "publish_tasks"("platform_account_id");

-- CreateIndex
CREATE INDEX "publish_tasks_job_id_idx" ON "publish_tasks"("job_id");

-- CreateIndex
CREATE INDEX "publish_tasks_platform_idx" ON "publish_tasks"("platform");

-- CreateIndex
CREATE INDEX "publish_tasks_status_idx" ON "publish_tasks"("status");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "processing_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_chapters" ADD CONSTRAINT "video_chapters_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_chapters" ADD CONSTRAINT "video_chapters_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_chapters" ADD CONSTRAINT "video_chapters_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "processing_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clip_candidates" ADD CONSTRAINT "clip_candidates_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clip_candidates" ADD CONSTRAINT "clip_candidates_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clip_candidates" ADD CONSTRAINT "clip_candidates_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "video_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clip_candidates" ADD CONSTRAINT "clip_candidates_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "processing_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_clips" ADD CONSTRAINT "short_clips_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_clips" ADD CONSTRAINT "short_clips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_clips" ADD CONSTRAINT "short_clips_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_clips" ADD CONSTRAINT "short_clips_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "video_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_clips" ADD CONSTRAINT "short_clips_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "clip_candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "video_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_accounts" ADD CONSTRAINT "platform_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_tasks" ADD CONSTRAINT "publish_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_tasks" ADD CONSTRAINT "publish_tasks_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_tasks" ADD CONSTRAINT "publish_tasks_short_clip_id_fkey" FOREIGN KEY ("short_clip_id") REFERENCES "short_clips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_tasks" ADD CONSTRAINT "publish_tasks_platform_account_id_fkey" FOREIGN KEY ("platform_account_id") REFERENCES "platform_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_tasks" ADD CONSTRAINT "publish_tasks_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "processing_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
