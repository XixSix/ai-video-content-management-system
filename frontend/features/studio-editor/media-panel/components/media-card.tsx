"use client"

import { useState } from "react"
import { Check, ListPlus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { StudioProjectMediaItem } from "@/features/studio-editor/studio.types"
import {
  useStudioPlaybackState,
  useStudioProjectActions,
  useStudioSelectionState,
} from "@/features/studio-editor/store/studio-editor-store"
import { cn } from "@/lib/utils"

import { getMediaLabel } from "../lib/media-display"
import { MediaThumbnail } from "./media-thumbnail"

export function MediaCard({ item }: { item: StudioProjectMediaItem }) {
  const [recentlyAdded, setRecentlyAdded] = useState(false)
  const { seekToTime } = useStudioPlaybackState()
  const { addProjectMediaToTimeline, removeProjectMedia } =
    useStudioProjectActions()
  const { selectedItem, selectedTargetId, setSelectedItemId } =
    useStudioSelectionState()
  const isSelected =
    selectedItem.id === item.id ||
    (item.linkedSelectionId ? selectedTargetId === item.linkedSelectionId : false)
  const canAddToTimeline =
    item.type === "VIDEO" || item.type === "AUDIO" || item.type === "IMAGE"
  const canDelete = item.origin !== "SOURCE"

  const handleSelect = () => {
    setSelectedItemId(item.id)

    if (typeof item.startTime === "number") {
      seekToTime(item.startTime)
    }
  }

  return (
    <div className="group min-w-0 text-left">
      <div
        className={cn(
          "relative aspect-[16/10] overflow-hidden rounded-md border bg-background transition",
          isSelected
            ? "border-sky-500/60 ring-1 ring-sky-500/35"
            : "border-border hover:border-foreground/22"
        )}
      >
        <MediaThumbnail item={item} />
        <button
          type="button"
          aria-label={`Select ${item.name}`}
          onClick={handleSelect}
          className="absolute inset-0 z-10"
        />
        <span className="absolute left-1.5 top-1.5 rounded bg-black/58 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {getMediaLabel(item)}
        </span>

        <div className="absolute right-1.5 top-1.5 z-20 flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          {canAddToTimeline ? (
            <Button
              type="button"
              variant="secondary"
              size="icon-xs"
              aria-label={`Add ${item.name} to timeline`}
              className="bg-background/90 shadow-sm backdrop-blur hover:bg-background"
              onClick={(event) => {
                event.stopPropagation()
                addProjectMediaToTimeline(item.id)
                setRecentlyAdded(true)
                window.setTimeout(() => setRecentlyAdded(false), 900)
              }}
            >
              {recentlyAdded ? (
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-300" />
              ) : (
                <ListPlus className="size-3.5" />
              )}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            size="icon-xs"
            aria-label={`Delete ${item.name}`}
            disabled={!canDelete}
            className="bg-background/90 shadow-sm backdrop-blur hover:bg-background disabled:opacity-45"
            onClick={(event) => {
              event.stopPropagation()

              if (canDelete) {
                removeProjectMedia(item.id)
              }
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={handleSelect}
        className="mt-2 block w-full min-w-0 text-left"
      >
        <span className="block truncate text-xs font-medium text-muted-foreground transition group-hover:text-foreground">
          {item.name}
        </span>
      </button>
    </div>
  )
}
