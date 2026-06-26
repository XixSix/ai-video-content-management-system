-- Normalize rendered short clip files into GeneratedAsset.
-- ShortClip remains the clip decision/timeline record; GeneratedAsset owns S3 files.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO "generated_assets" (
  "id",
  "user_id",
  "media_id",
  "project_id",
  "transcript_id",
  "chapter_id",
  "short_clip_id",
  "asset_type",
  "transcript_version",
  "s3_bucket",
  "s3_key",
  "mime_type",
  "metadata",
  "created_at"
)
SELECT
  gen_random_uuid(),
  sc."user_id",
  sc."media_id",
  sc."project_id",
  sc."transcript_id",
  sc."chapter_id",
  sc."id",
  'SHORT_CLIP_VIDEO'::"AssetType",
  sc."transcript_version",
  m."s3_bucket",
  sc."video_path",
  COALESCE(m."mime_type", 'video/mp4'),
  jsonb_build_object('legacyPathField', 'videoPath'),
  sc."updated_at"
FROM "short_clips" sc
JOIN "media" m ON m."id" = sc."media_id"
WHERE sc."video_path" IS NOT NULL
  AND sc."video_path" <> ''
ON CONFLICT ("s3_bucket", "s3_key") DO NOTHING;

INSERT INTO "generated_assets" (
  "id",
  "user_id",
  "media_id",
  "project_id",
  "transcript_id",
  "chapter_id",
  "short_clip_id",
  "asset_type",
  "transcript_version",
  "s3_bucket",
  "s3_key",
  "mime_type",
  "metadata",
  "created_at"
)
SELECT
  gen_random_uuid(),
  sc."user_id",
  sc."media_id",
  sc."project_id",
  sc."transcript_id",
  sc."chapter_id",
  sc."id",
  'SHORT_CLIP_THUMBNAIL'::"AssetType",
  sc."transcript_version",
  m."s3_bucket",
  sc."thumbnail_path",
  CASE
    WHEN lower(sc."thumbnail_path") LIKE '%.png' THEN 'image/png'
    WHEN lower(sc."thumbnail_path") LIKE '%.webp' THEN 'image/webp'
    ELSE 'image/jpeg'
  END,
  jsonb_build_object('legacyPathField', 'thumbnailPath'),
  sc."updated_at"
FROM "short_clips" sc
JOIN "media" m ON m."id" = sc."media_id"
WHERE sc."thumbnail_path" IS NOT NULL
  AND sc."thumbnail_path" <> ''
ON CONFLICT ("s3_bucket", "s3_key") DO NOTHING;

INSERT INTO "generated_assets" (
  "id",
  "user_id",
  "media_id",
  "project_id",
  "transcript_id",
  "chapter_id",
  "short_clip_id",
  "asset_type",
  "transcript_version",
  "s3_bucket",
  "s3_key",
  "mime_type",
  "metadata",
  "created_at"
)
SELECT
  gen_random_uuid(),
  sc."user_id",
  sc."media_id",
  sc."project_id",
  sc."transcript_id",
  sc."chapter_id",
  sc."id",
  'SHORT_CLIP_SUBTITLE'::"AssetType",
  sc."transcript_version",
  m."s3_bucket",
  sc."subtitle_path",
  CASE
    WHEN lower(sc."subtitle_path") LIKE '%.vtt' THEN 'text/vtt'
    ELSE 'application/x-subrip'
  END,
  jsonb_build_object('legacyPathField', 'subtitlePath'),
  sc."updated_at"
FROM "short_clips" sc
JOIN "media" m ON m."id" = sc."media_id"
WHERE sc."subtitle_path" IS NOT NULL
  AND sc."subtitle_path" <> ''
ON CONFLICT ("s3_bucket", "s3_key") DO NOTHING;

ALTER TABLE "short_clips"
  DROP COLUMN "caption",
  DROP COLUMN "description",
  DROP COLUMN "hashtags",
  DROP COLUMN "video_path",
  DROP COLUMN "thumbnail_path",
  DROP COLUMN "subtitle_path";
