import type { MediaLibraryItem } from "@/features/media-library/media-library.types"
import { formatDuration } from "@/features/media-library/media-library.utils"

import type { StudioProjectMediaItem } from "../../studio.types"

export type MediaFilter = "ALL" | "IMAGE" | "VIDEO" | "AUDIO"

export const mediaFilters: Array<{
  label: string
  value: MediaFilter
}> = [
  { label: "All", value: "ALL" },
  { label: "Images", value: "IMAGE" },
  { label: "Videos", value: "VIDEO" },
  { label: "Audio", value: "AUDIO" },
]

export function getMediaLabel(item: StudioProjectMediaItem) {
  return item.durationLabel ?? item.dimensionsLabel ?? item.format
}

export function getMediaImportMetadata(item: MediaLibraryItem) {
  const typeLabel = item.type.toLowerCase()

  if (item.type === "IMAGE") {
    const resolution =
      item.width && item.height
        ? `${item.width}×${item.height}`
        : "Resolution unavailable"

    return `${typeLabel} · ${resolution}`
  }

  return `${typeLabel} · ${formatDuration(item.duration)}`
}
