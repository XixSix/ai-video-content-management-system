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
