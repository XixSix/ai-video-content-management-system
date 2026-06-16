"use client"

import type { StudioProjectMediaItem } from "@/features/studio-editor/studio.types"
import {
  useStudioPlaybackState,
  useStudioSelectionState,
} from "@/features/studio-editor/store/studio-editor-store"
import { cn } from "@/lib/utils"

import { getMediaLabel } from "../lib/media-display"
import { MediaThumbnail } from "./media-thumbnail"

export function MediaCard({ item }: { item: StudioProjectMediaItem }) {
  const { seekToTime } = useStudioPlaybackState()
  const { selectedItem, selectedTargetId, setSelectedItemId } =
    useStudioSelectionState()
  const isSelected =
    selectedItem.id === item.id ||
    (item.linkedSelectionId ? selectedTargetId === item.linkedSelectionId : false)

  return (
    <button
      type="button"
      onClick={() => {
        setSelectedItemId(item.id)

        if (typeof item.startTime === "number") {
          seekToTime(item.startTime)
        }
      }}
      className="group min-w-0 text-left"
    >
      <div
        className={cn(
          "relative aspect-[16/10] overflow-hidden rounded-md border bg-background transition",
          isSelected
            ? "border-sky-500/60 ring-1 ring-sky-500/35"
            : "border-border hover:border-foreground/22"
        )}
      >
        <MediaThumbnail item={item} />
        <span className="absolute left-1.5 top-1.5 rounded bg-black/58 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {getMediaLabel(item)}
        </span>
      </div>
      <p className="mt-2 truncate text-xs font-medium text-muted-foreground transition group-hover:text-foreground">
        {item.name}
      </p>
    </button>
  )
}
