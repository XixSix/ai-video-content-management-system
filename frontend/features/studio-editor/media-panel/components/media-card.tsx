"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Clapperboard, LoaderCircle, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useMediaPreviewUrl } from "@/features/media-library/hooks/use-media-mutations"
import type { StudioProjectMediaItem } from "@/features/studio-editor/studio.types"
import {
  useStudioPlaybackState,
  useStudioProjectActions,
  useStudioSelectionState,
} from "@/features/studio-editor/store/studio-editor-store"
import { cn } from "@/lib/utils"

import { getMediaLabel } from "../lib/media-display"
import { MediaThumbnail } from "./media-thumbnail"

export function MediaCard({
  canEdit,
  detaching,
  item,
  onDetach,
  onSetSource,
  settingSource,
  workspaceId,
}: {
  canEdit: boolean
  detaching: boolean
  item: StudioProjectMediaItem
  onDetach: (item: StudioProjectMediaItem) => void
  onSetSource: (item: StudioProjectMediaItem) => void
  settingSource: boolean
  workspaceId: string
}) {
  const [recentlyAdded, setRecentlyAdded] = useState(false)
  const previewRetryRef = useRef(false)
  const { seekToTime } = useStudioPlaybackState()
  const { addProjectMediaToTimeline } = useStudioProjectActions()
  const shouldFetchPreviewUrl =
    item.type === "IMAGE" || (item.type === "VIDEO" && !item.thumbnailUrl)
  const previewUrlQuery = useMediaPreviewUrl(
    workspaceId,
    item.id,
    shouldFetchPreviewUrl
  )
  const previewUrl = previewUrlQuery.data?.url

  useEffect(() => {
    previewRetryRef.current = false
  }, [previewUrl])
  const { selectedItem, selectedTargetId, setSelectedItemId } =
    useStudioSelectionState()
  const isSelected =
    selectedItem.id === item.id ||
    (item.linkedSelectionId ? selectedTargetId === item.linkedSelectionId : false)
  const canAddToTimeline =
    Boolean(item.projectMediaId) &&
    (item.type === "VIDEO" || item.type === "AUDIO" || item.type === "IMAGE")
  const canDelete =
    item.origin !== "SOURCE" && Boolean(item.projectMediaId)
  const canSetAsSource =
    item.origin !== "SOURCE" &&
    Boolean(item.projectMediaId) &&
    (item.type === "VIDEO" || item.type === "AUDIO")

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
        <MediaThumbnail
          item={item}
          previewUrl={previewUrl}
          onPreviewError={() => {
            if (!previewRetryRef.current) {
              previewRetryRef.current = true
              void previewUrlQuery.refetch()
            }
          }}
        />
        <button
          type="button"
          aria-label={`Select ${item.name}`}
          onClick={handleSelect}
          className="absolute inset-0 z-10"
        />
        <span className="absolute left-1.5 top-1.5 rounded bg-black/58 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {getMediaLabel(item)}
        </span>

        <div className="absolute right-1.5 top-1.5 z-20 flex translate-y-1 overflow-hidden rounded-md border border-white/10 bg-zinc-800/90 p-0.5 text-white opacity-0 shadow-lg backdrop-blur-md transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          {canSetAsSource && canEdit ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Set ${item.name} as source`}
                  disabled={settingSource}
                  className="rounded-sm text-white hover:bg-white/15 hover:text-white"
                  onClick={(event) => {
                    event.stopPropagation()
                    onSetSource(item)
                  }}
                >
                  {settingSource ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Clapperboard className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Set as source
              </TooltipContent>
            </Tooltip>
          ) : null}

          {canAddToTimeline && canEdit ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Add ${item.name} to timeline`}
                  className="rounded-sm text-white hover:bg-white/15 hover:text-white"
                  onClick={(event) => {
                    event.stopPropagation()
                    addProjectMediaToTimeline(item.id)
                    setRecentlyAdded(true)
                    window.setTimeout(() => setRecentlyAdded(false), 900)
                  }}
                >
                  {recentlyAdded ? (
                    <Check className="size-3.5 text-emerald-300" />
                  ) : (
                    <Plus className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Add to timeline
              </TooltipContent>
            </Tooltip>
          ) : null}

          {canDelete ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${item.name} from project`}
                  disabled={!canEdit || detaching}
                  className="rounded-sm text-white hover:bg-red-500/20 hover:text-red-200"
                  onClick={(event) => {
                    event.stopPropagation()

                    if (canEdit) {
                      onDetach(item)
                    }
                  }}
                >
                  {detaching ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Remove from project
              </TooltipContent>
            </Tooltip>
          ) : null}
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
