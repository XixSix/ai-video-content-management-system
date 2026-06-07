DELETE FROM "generated_assets"
WHERE "asset_type" = 'ORIGINAL_MEDIA';

ALTER TYPE "AssetType" RENAME TO "AssetType_old";

CREATE TYPE "AssetType" AS ENUM (
  'THUMBNAIL',
  'SUBTITLE_SRT',
  'SUBTITLE_VTT',
  'BURNED_SUBTITLE_VIDEO'
);

ALTER TABLE "generated_assets"
ALTER COLUMN "asset_type" TYPE "AssetType"
USING "asset_type"::text::"AssetType";

DROP TYPE "AssetType_old";
