import { mediaLibraryItems } from "@/features/media-library/media-library.data"
import type { MediaLibraryItem } from "@/features/media-library/media-library.types"
import {
  formatDuration,
  formatFileSize,
} from "@/features/media-library/media-library.utils"

import type { StudioProjectMediaItem } from "../studio.types"

function getMediaLibraryItem(itemId: string) {
  const item = mediaLibraryItems.find((mediaItem) => mediaItem.id === itemId)

  if (!item) {
    throw new Error(`Missing mock media library item: ${itemId}`)
  }

  return item
}

function getStudioMediaType(
  item: MediaLibraryItem
): StudioProjectMediaItem["type"] {
  if (item.type === "VIDEO" || item.type === "AUDIO" || item.type === "IMAGE") {
    return item.type
  }

  return "SUBTITLE"
}

function getFormatLabel(mimeType: string) {
  const subtype = mimeType.split("/")[1] ?? mimeType
  return subtype.split(";")[0].toUpperCase()
}

export function getResolutionLabel(item: MediaLibraryItem) {
  if (typeof item.width === "number" && typeof item.height === "number") {
    return `${item.width}x${item.height}`
  }

  return undefined
}

function getMediaMetadata(item: MediaLibraryItem) {
  const parts = [
    item.duration !== null ? formatDuration(item.duration) : null,
    getResolutionLabel(item),
    formatFileSize(item.fileSizeBytes),
  ].filter(Boolean)

  return parts.join(" · ")
}

function getStudioMediaStatus(
  item: MediaLibraryItem
): StudioProjectMediaItem["status"] {
  if (item.status === "UPLOADED") {
    return "READY"
  }

  if (item.status === "UPLOADING") {
    return "UPLOADING"
  }

  return "FAILED"
}

export function createStudioMediaItem(
  item: MediaLibraryItem,
  overrides: Partial<StudioProjectMediaItem> = {}
): StudioProjectMediaItem {
  const studioType = getStudioMediaType(item)
  const resolutionLabel = getResolutionLabel(item)

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
            ? "Image asset from the media library ready for overlays."
            : "Text-based generated asset from the media library.",
    origin: item.libraryGroup === "ORIGINAL" ? "LIBRARY" : "UPLOAD",
    status: getStudioMediaStatus(item),
    assetUrl: item.assetUrl,
    thumbnailUrl: item.thumbnailUrl,
    format: getFormatLabel(item.mimeType),
    metadata: getMediaMetadata(item),
    usageLabel: item.libraryGroup === "ORIGINAL" ? "Media Library" : "Generated output",
    durationSeconds: item.duration ?? undefined,
    durationLabel: item.duration !== null ? formatDuration(item.duration) : undefined,
    resolutionLabel,
    dimensionsLabel: studioType === "IMAGE" ? resolutionLabel : undefined,
    sizeLabel: formatFileSize(item.fileSizeBytes),
    ...overrides,
  }
}

export const sourceMediaItem = getMediaLibraryItem("media-library-1")
export const bRollMediaItem = getMediaLibraryItem("media-library-3")
export const guideAudioItem = getMediaLibraryItem("media-library-2")
export const captionedMasterItem = getMediaLibraryItem("media-library-editor-1")
export const brandMarkItem = getMediaLibraryItem("media-library-editor-3")
export const stillFrameItem = getMediaLibraryItem("media-library-5")
