import type { MediaLibraryItem } from "@/features/media-library/types/media-library.types";
import {
  formatDuration,
  formatFileSize,
} from "@/features/media-library/utils/media-library.utils";

import type { StudioProjectMediaItem } from "../studio.types";

const studioEditorMediaLibraryItems: MediaLibraryItem[] = [
  {
    id: "media-library-1",
    title: "Vertical Shorts Explainer",
    originalFilename:
      "YTDown_Shorts_Tai-Sao-Ong-Ta-Lai-Cat-Banh-Mot-Cach-Chi_Media_b8-wz8QqAFY_001_1080p.mp4",
    assetUrl:
      "/YTDown_Shorts_Tai-Sao-Ong-Ta-Lai-Cat-Banh-Mot-Cach-Chi_Media_b8-wz8QqAFY_001_1080p.mp4",
    thumbnailUrl: "/pexels-danil-lysov-175964361-12377231.jpg",
    duration: 28,
    fileSizeBytes: 11_006_041,
    mimeType: "video/mp4",
    type: "VIDEO",
    libraryGroup: "ORIGINAL",
    status: "UPLOADED",
    width: 1080,
    height: 1920,
    createdAt: "2026-06-10T08:24:00.000Z",
    updatedAt: "2026-06-10T10:14:00.000Z",
    hasTranscript: true,
    hasChapters: true,
    hasClips: true,
    hasSubtitles: true,
    activeJobCount: 0,
    longToShortSourceId: "source_launch_keynote",
  },
  {
    id: "media-library-2",
    title: "Vietnamese Audio Sample",
    originalFilename:
      "YTDown_Shorts_Gau-Khong-Lang-Phi-Nhu-Ban-Nghi_Media_307SMR9ERs_009_128k.mp3",
    assetUrl:
      "/YTDown_Shorts_Gau-Khong-Lang-Phi-Nhu-Ban-Nghi_Media_307SMR9ERs_009_128k.mp3",
    thumbnailUrl: "/pexels-francesco-ungaro-16771889.jpg",
    duration: 55,
    fileSizeBytes: 1_108_400,
    mimeType: "audio/mpeg",
    type: "AUDIO",
    libraryGroup: "ORIGINAL",
    status: "UPLOADED",
    width: null,
    height: null,
    createdAt: "2026-06-09T15:01:00.000Z",
    updatedAt: "2026-06-09T16:24:00.000Z",
    hasTranscript: true,
    hasChapters: false,
    hasClips: false,
    hasSubtitles: false,
    activeJobCount: 1,
    longToShortSourceId: "source_founder_ama",
  },
  {
    id: "media-library-3",
    title: "Wildlife Horizontal Sample",
    originalFilename:
      "YTDown_YouTube_Wildlife-Windows-7-Sample-Video_Media_a3ICNMQW7Ok_001_720p.mp4",
    assetUrl:
      "/YTDown_YouTube_Wildlife-Windows-7-Sample-Video_Media_a3ICNMQW7Ok_001_720p.mp4",
    thumbnailUrl: "/pexels-francesco-ungaro-16771889.jpg",
    duration: 30,
    fileSizeBytes: 8_676_743,
    mimeType: "video/mp4",
    type: "VIDEO",
    libraryGroup: "ORIGINAL",
    status: "UPLOADED",
    width: 1280,
    height: 720,
    createdAt: "2026-06-08T10:22:00.000Z",
    updatedAt: "2026-06-09T15:06:00.000Z",
    hasTranscript: true,
    hasChapters: true,
    hasClips: true,
    hasSubtitles: false,
    activeJobCount: 0,
    longToShortSourceId: "source_retail_story",
  },
  {
    id: "media-library-5",
    title: "Horizontal Landscape Still",
    originalFilename: "pexels-francesco-ungaro-16771889.jpg",
    assetUrl: "/pexels-francesco-ungaro-16771889.jpg",
    thumbnailUrl: "/pexels-francesco-ungaro-16771889.jpg",
    duration: null,
    fileSizeBytes: 797_182,
    mimeType: "image/jpeg",
    type: "IMAGE",
    libraryGroup: "ORIGINAL",
    status: "UPLOADED",
    width: 4000,
    height: 3000,
    createdAt: "2026-06-11T02:42:00.000Z",
    updatedAt: "2026-06-11T02:42:00.000Z",
    hasTranscript: false,
    hasChapters: false,
    hasClips: false,
    hasSubtitles: false,
    activeJobCount: 0,
  },
  {
    id: "media-library-editor-1",
    title: "Launch Keynote Captioned Master",
    originalFilename: "launch-keynote-captioned-master.mp4",
    assetUrl:
      "/YTDown_YouTube_Wildlife-Windows-7-Sample-Video_Media_a3ICNMQW7Ok_001_720p.mp4",
    thumbnailUrl: "/pexels-francesco-ungaro-16771889.jpg",
    duration: 1864,
    fileSizeBytes: 188_024_832,
    mimeType: "video/mp4",
    type: "VIDEO",
    libraryGroup: "EDITOR_OUTPUT",
    status: "UPLOADED",
    width: 1920,
    height: 1080,
    createdAt: "2026-06-10T11:18:00.000Z",
    updatedAt: "2026-06-10T11:42:00.000Z",
    hasTranscript: true,
    hasChapters: true,
    hasClips: false,
    hasSubtitles: true,
    activeJobCount: 0,
  },
  {
    id: "media-library-editor-3",
    title: "Product Launch Thumbnail Set",
    originalFilename: "product-launch-thumbnail-cover.png",
    assetUrl: "/pexels-francesco-ungaro-16771889.jpg",
    thumbnailUrl: "/pexels-francesco-ungaro-16771889.jpg",
    duration: null,
    fileSizeBytes: 4_284_416,
    mimeType: "image/png",
    type: "IMAGE",
    libraryGroup: "EDITOR_OUTPUT",
    status: "UPLOADED",
    width: 1920,
    height: 1080,
    createdAt: "2026-06-10T12:22:00.000Z",
    updatedAt: "2026-06-10T12:22:00.000Z",
    hasTranscript: false,
    hasChapters: false,
    hasClips: false,
    hasSubtitles: false,
    activeJobCount: 0,
  },
];

function getMediaLibraryItem(itemId: string) {
  const item = studioEditorMediaLibraryItems.find(
    (mediaItem) => mediaItem.id === itemId,
  );

  if (!item) {
    throw new Error(`Missing mock media library item: ${itemId}`);
  }

  return item;
}

function getStudioMediaType(
  item: MediaLibraryItem,
): StudioProjectMediaItem["type"] {
  if (item.type === "VIDEO" || item.type === "AUDIO" || item.type === "IMAGE") {
    return item.type;
  }

  return "SUBTITLE";
}

function getFormatLabel(mimeType: string) {
  const subtype = mimeType.split("/")[1] ?? mimeType;
  return subtype.split(";")[0].toUpperCase();
}

export function getResolutionLabel(item: MediaLibraryItem) {
  if (typeof item.width === "number" && typeof item.height === "number") {
    return `${item.width}x${item.height}`;
  }

  return undefined;
}

function getMediaMetadata(item: MediaLibraryItem) {
  const parts = [
    item.duration !== null ? formatDuration(item.duration) : null,
    getResolutionLabel(item),
    formatFileSize(item.fileSizeBytes),
  ].filter(Boolean);

  return parts.join(" · ");
}

function getStudioMediaStatus(
  item: MediaLibraryItem,
): StudioProjectMediaItem["status"] {
  if (item.status === "UPLOADED") {
    return "READY";
  }

  if (item.status === "UPLOADING") {
    return "UPLOADING";
  }

  return "FAILED";
}

export function createStudioMediaItem(
  item: MediaLibraryItem,
  overrides: Partial<StudioProjectMediaItem> = {},
): StudioProjectMediaItem {
  const studioType = getStudioMediaType(item);
  const resolutionLabel = getResolutionLabel(item);

  return {
    id: item.id,
    type: studioType,
    name: item.originalFilename,
    summary:
      studioType === "VIDEO"
        ? "Video from the media library ready for timeline work."
        : studioType === "AUDIO"
          ? "Audio from the media library ready for editing."
          : studioType === "IMAGE"
            ? "Image media from the media library ready for overlays."
            : "Text-based generated asset from the media library.",
    origin: item.libraryGroup === "ORIGINAL" ? "LIBRARY" : "UPLOAD",
    status: getStudioMediaStatus(item),
    assetUrl: item.assetUrl,
    thumbnailUrl: item.thumbnailUrl,
    format: getFormatLabel(item.mimeType),
    metadata: getMediaMetadata(item),
    usageLabel:
      item.libraryGroup === "ORIGINAL" ? "Media Library" : "Generated output",
    durationSeconds: item.duration ?? undefined,
    durationLabel:
      item.duration !== null ? formatDuration(item.duration) : undefined,
    resolutionLabel,
    dimensionsLabel: studioType === "IMAGE" ? resolutionLabel : undefined,
    sizeLabel: formatFileSize(item.fileSizeBytes),
    sourceLibraryItemId: item.id,
    ...overrides,
  };
}

export const sourceMediaItem = getMediaLibraryItem("media-library-1");
export const bRollMediaItem = getMediaLibraryItem("media-library-3");
export const guideAudioItem = getMediaLibraryItem("media-library-2");
export const captionedMasterItem = getMediaLibraryItem(
  "media-library-editor-1",
);
export const brandMarkItem = getMediaLibraryItem("media-library-editor-3");
export const stillFrameItem = getMediaLibraryItem("media-library-5");
