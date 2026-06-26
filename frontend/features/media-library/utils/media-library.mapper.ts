import type { GeneratedAssetData } from "@/features/assets/asset.types";

import type {
  MediaListItemResponseData,
  MediaAssetType,
  MediaLibraryItem,
} from "../types/media-library.types";
import { getMediaListThumbnailUrl } from "../lib/media-previews";

function formatAssetTitle(asset: GeneratedAssetData) {
  return asset.assetType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAssetMediaType(asset: GeneratedAssetData): MediaAssetType {
  if (asset.assetType === "EXPORT_AUDIO") {
    return "AUDIO";
  }

  if (
    asset.assetType === "SUBTITLE_SRT" ||
    asset.assetType === "SUBTITLE_VTT"
  ) {
    return "TRANSCRIPT";
  }

  if (
    asset.assetType === "THUMBNAIL" ||
    asset.assetType === "THUMBNAIL_SPRITE"
  ) {
    return "IMAGE";
  }

  return "VIDEO";
}

export function mapMediaResponseToLibraryItem(
  media: MediaListItemResponseData,
): MediaLibraryItem {
  return {
    id: media.id,
    title: media.title ?? media.originalFilename,
    originalFilename: media.originalFilename,
    assetUrl: null,
    thumbnailUrl: getMediaListThumbnailUrl(media),
    duration: media.duration,
    fileSizeBytes: Number(media.fileSizeBytes ?? 0),
    mimeType: media.mimeType ?? "application/octet-stream",
    type: media.type === "SUBTITLE" ? "TRANSCRIPT" : media.type,
    libraryGroup: "ORIGINAL",
    status: media.status,
    width: media.width,
    height: media.height,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
    hasTranscript: false,
    hasChapters: false,
    hasClips: false,
    hasSubtitles: media.type === "SUBTITLE",
    activeJobCount: 0,
    longToShortSourceId:
      media.type === "VIDEO" && media.status === "UPLOADED"
        ? media.id
        : undefined,
    uploadInterrupted: media.status === "UPLOADING",
  };
}

export function mapGeneratedAssetToLibraryItem(
  asset: GeneratedAssetData,
): MediaLibraryItem {
  const title = formatAssetTitle(asset);

  return {
    id: asset.id,
    title,
    originalFilename: title,
    assetUrl: null,
    thumbnailUrl: null,
    duration: null,
    fileSizeBytes: Number(asset.fileSizeBytes ?? 0),
    mimeType: asset.mimeType ?? "application/octet-stream",
    type: getAssetMediaType(asset),
    libraryGroup: "EDITOR_OUTPUT",
    status: "UPLOADED",
    width: null,
    height: null,
    createdAt: asset.createdAt,
    updatedAt: asset.createdAt,
    hasTranscript: false,
    hasChapters: false,
    hasClips: false,
    hasSubtitles:
      asset.assetType === "SUBTITLE_SRT" || asset.assetType === "SUBTITLE_VTT",
    activeJobCount: 0,
    ownerName: asset.projectId ? "Editor output" : "Generated asset",
  };
}
