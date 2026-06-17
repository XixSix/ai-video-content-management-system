-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "ProjectMediaRole" AS ENUM ('SOURCE', 'OVERLAY', 'AUDIO_BED', 'GENERATED', 'REFERENCE');

-- CreateEnum
CREATE TYPE "EditorLayerKind" AS ENUM ('TEXT', 'CAPTIONS', 'IMAGE');

-- CreateEnum
CREATE TYPE "TimelineTrackType" AS ENUM ('TEXT', 'IMAGES', 'SOURCE', 'AUDIO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssetType" ADD VALUE 'THUMBNAIL';
ALTER TYPE "AssetType" ADD VALUE 'EXPORT_VIDEO';
ALTER TYPE "AssetType" ADD VALUE 'EXPORT_AUDIO';
ALTER TYPE "AssetType" ADD VALUE 'WAVEFORM_PEAKS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobStatus" ADD VALUE 'RUNNING';
ALTER TYPE "JobStatus" ADD VALUE 'CANCELED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobType" ADD VALUE 'GENERATE_AI_SUGGESTIONS';
ALTER TYPE "JobType" ADD VALUE 'RENDER_EXPORT';
ALTER TYPE "JobType" ADD VALUE 'MEDIA_TRANSCODE';
ALTER TYPE "JobType" ADD VALUE 'THUMBNAIL_GENERATION';
ALTER TYPE "JobType" ADD VALUE 'WAVEFORM_PEAK_GENERATION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MediaType" ADD VALUE 'AUDIO';
ALTER TYPE "MediaType" ADD VALUE 'SUBTITLE';
ALTER TYPE "MediaType" ADD VALUE 'DOCUMENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Platform" ADD VALUE 'LINKEDIN';
ALTER TYPE "Platform" ADD VALUE 'X';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TargetType" ADD VALUE 'PROJECT';
ALTER TYPE "TargetType" ADD VALUE 'TRANSCRIPT';

-- AlterTable
ALTER TABLE "ai_suggestions" ADD COLUMN     "project_id" UUID;

-- AlterTable
ALTER TABLE "clip_candidates" ADD COLUMN     "project_id" UUID;

-- AlterTable
ALTER TABLE "generated_assets" ADD COLUMN     "job_id" UUID,
ADD COLUMN     "media_id" UUID,
ADD COLUMN     "project_id" UUID,
ADD COLUMN     "short_clip_id" UUID;

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "workspace_id" UUID;

-- AlterTable
ALTER TABLE "processing_jobs" ADD COLUMN     "current_step" VARCHAR(255),
ADD COLUMN     "project_id" UUID;

-- AlterTable
ALTER TABLE "publish_tasks" ADD COLUMN     "project_id" UUID;

-- AlterTable
ALTER TABLE "short_clips" ADD COLUMN     "project_id" UUID;

-- AlterTable
ALTER TABLE "transcripts" ADD COLUMN     "project_id" UUID;

-- AlterTable
ALTER TABLE "video_chapters" ADD COLUMN     "project_id" UUID;

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "workspace_id" UUID,
    "source_media_id" UUID,
    "thumbnail_media_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "aspect_ratio" VARCHAR(20) NOT NULL DEFAULT '9:16',
    "duration" DOUBLE PRECISION,
    "current_document_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_media" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "role" "ProjectMediaRole" NOT NULL DEFAULT 'REFERENCE',
    "display_name" VARCHAR(255),
    "start_time" DOUBLE PRECISION,
    "duration" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editor_documents" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "document_json" JSONB NOT NULL,
    "saved_by_user_id" UUID,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editor_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editor_document_versions" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "document_json" JSONB NOT NULL,
    "saved_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "editor_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canvas_layers" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "linked_media_id" UUID,
    "kind" "EditorLayerKind" NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "content" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "x_percent" DOUBLE PRECISION,
    "y_percent" DOUBLE PRECISION,
    "box_width_percent" DOUBLE PRECISION,
    "rotation_degrees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "z_index" INTEGER NOT NULL DEFAULT 0,
    "style_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canvas_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_tracks" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "type" "TimelineTrackType" NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_segments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "track_id" UUID NOT NULL,
    "layer_id" UUID,
    "media_id" UUID,
    "label" VARCHAR(255) NOT NULL,
    "content" TEXT,
    "start_time" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "lane_index" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timeline_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_events" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "message" TEXT,
    "progress" INTEGER,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspaces_owner_id_idx" ON "workspaces"("owner_id");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "projects_workspace_id_idx" ON "projects"("workspace_id");

-- CreateIndex
CREATE INDEX "projects_source_media_id_idx" ON "projects"("source_media_id");

-- CreateIndex
CREATE INDEX "projects_thumbnail_media_id_idx" ON "projects"("thumbnail_media_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE UNIQUE INDEX "projects_user_id_slug_key" ON "projects"("user_id", "slug");

-- CreateIndex
CREATE INDEX "project_media_project_id_idx" ON "project_media"("project_id");

-- CreateIndex
CREATE INDEX "project_media_media_id_idx" ON "project_media"("media_id");

-- CreateIndex
CREATE INDEX "project_media_role_idx" ON "project_media"("role");

-- CreateIndex
CREATE INDEX "project_media_project_id_media_id_role_idx" ON "project_media"("project_id", "media_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "editor_documents_project_id_key" ON "editor_documents"("project_id");

-- CreateIndex
CREATE INDEX "editor_documents_saved_by_user_id_idx" ON "editor_documents"("saved_by_user_id");

-- CreateIndex
CREATE INDEX "editor_document_versions_saved_by_user_id_idx" ON "editor_document_versions"("saved_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "editor_document_versions_project_id_version_key" ON "editor_document_versions"("project_id", "version");

-- CreateIndex
CREATE INDEX "canvas_layers_project_id_idx" ON "canvas_layers"("project_id");

-- CreateIndex
CREATE INDEX "canvas_layers_linked_media_id_idx" ON "canvas_layers"("linked_media_id");

-- CreateIndex
CREATE INDEX "canvas_layers_kind_idx" ON "canvas_layers"("kind");

-- CreateIndex
CREATE INDEX "timeline_tracks_project_id_sort_order_idx" ON "timeline_tracks"("project_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_tracks_project_id_type_key" ON "timeline_tracks"("project_id", "type");

-- CreateIndex
CREATE INDEX "timeline_segments_project_id_idx" ON "timeline_segments"("project_id");

-- CreateIndex
CREATE INDEX "timeline_segments_track_id_idx" ON "timeline_segments"("track_id");

-- CreateIndex
CREATE INDEX "timeline_segments_layer_id_idx" ON "timeline_segments"("layer_id");

-- CreateIndex
CREATE INDEX "timeline_segments_media_id_idx" ON "timeline_segments"("media_id");

-- CreateIndex
CREATE INDEX "timeline_segments_project_id_start_time_idx" ON "timeline_segments"("project_id", "start_time");

-- CreateIndex
CREATE INDEX "job_events_job_id_idx" ON "job_events"("job_id");

-- CreateIndex
CREATE INDEX "job_events_created_at_idx" ON "job_events"("created_at");

-- CreateIndex
CREATE INDEX "ai_suggestions_project_id_idx" ON "ai_suggestions"("project_id");

-- CreateIndex
CREATE INDEX "clip_candidates_project_id_idx" ON "clip_candidates"("project_id");

-- CreateIndex
CREATE INDEX "generated_assets_media_id_idx" ON "generated_assets"("media_id");

-- CreateIndex
CREATE INDEX "generated_assets_project_id_idx" ON "generated_assets"("project_id");

-- CreateIndex
CREATE INDEX "generated_assets_short_clip_id_idx" ON "generated_assets"("short_clip_id");

-- CreateIndex
CREATE INDEX "generated_assets_job_id_idx" ON "generated_assets"("job_id");

-- CreateIndex
CREATE INDEX "media_workspace_id_idx" ON "media"("workspace_id");

-- CreateIndex
CREATE INDEX "processing_jobs_project_id_idx" ON "processing_jobs"("project_id");

-- CreateIndex
CREATE INDEX "publish_tasks_project_id_idx" ON "publish_tasks"("project_id");

-- CreateIndex
CREATE INDEX "short_clips_project_id_idx" ON "short_clips"("project_id");

-- CreateIndex
CREATE INDEX "transcripts_project_id_idx" ON "transcripts"("project_id");

-- CreateIndex
CREATE INDEX "video_chapters_project_id_idx" ON "video_chapters"("project_id");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_source_media_id_fkey" FOREIGN KEY ("source_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_thumbnail_media_id_fkey" FOREIGN KEY ("thumbnail_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editor_documents" ADD CONSTRAINT "editor_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editor_documents" ADD CONSTRAINT "editor_documents_saved_by_user_id_fkey" FOREIGN KEY ("saved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editor_document_versions" ADD CONSTRAINT "editor_document_versions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editor_document_versions" ADD CONSTRAINT "editor_document_versions_saved_by_user_id_fkey" FOREIGN KEY ("saved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_layers" ADD CONSTRAINT "canvas_layers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_layers" ADD CONSTRAINT "canvas_layers_linked_media_id_fkey" FOREIGN KEY ("linked_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_tracks" ADD CONSTRAINT "timeline_tracks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_segments" ADD CONSTRAINT "timeline_segments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_segments" ADD CONSTRAINT "timeline_segments_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "timeline_tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_segments" ADD CONSTRAINT "timeline_segments_layer_id_fkey" FOREIGN KEY ("layer_id") REFERENCES "canvas_layers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_segments" ADD CONSTRAINT "timeline_segments_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "processing_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_chapters" ADD CONSTRAINT "video_chapters_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clip_candidates" ADD CONSTRAINT "clip_candidates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_clips" ADD CONSTRAINT "short_clips_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_short_clip_id_fkey" FOREIGN KEY ("short_clip_id") REFERENCES "short_clips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "processing_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_tasks" ADD CONSTRAINT "publish_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
