"use client"

import { useMemo, useState } from "react"
import { CloudUpload, FileMusic, ImageIcon, Library, Video } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StudioPanelShell } from "@/features/studio-editor/components/studio-panel-shell"
import { useStudioEditor } from "@/features/studio-editor/studio-editor-context"
import type {
  StudioProjectMediaItem,
  StudioProjectMediaType,
} from "@/features/studio-editor/studio.types"
import { cn } from "@/lib/utils"

type MediaFilter = "ALL" | "IMAGE" | "VIDEO" | "AUDIO"

const mediaFilters: Array<{
  label: string
  value: MediaFilter
}> = [
  { label: "All", value: "ALL" },
  { label: "Images", value: "IMAGE" },
  { label: "Videos", value: "VIDEO" },
  { label: "Audio", value: "AUDIO" },
]

function getMediaLabel(item: StudioProjectMediaItem) {
  return item.durationLabel ?? item.dimensionsLabel ?? item.format
}

function MediaFileIcon({ type }: { type: StudioProjectMediaType }) {
  if (type === "AUDIO") {
    return <FileMusic className="size-9 text-muted-foreground" />
  }

  if (type === "IMAGE") {
    return <ImageIcon className="size-9 text-muted-foreground" />
  }

  return <Video className="size-9 text-muted-foreground" />
}

function MediaThumbnail({ item }: { item: StudioProjectMediaItem }) {
  if (item.type === "VIDEO") {
    return (
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-[linear-gradient(135deg,#273749,#16202f)]">
        <div className="absolute inset-x-[16%] bottom-[16%] h-[14%] rounded bg-black/45" />
        <div className="absolute right-[10%] top-[14%] h-[34%] w-[24%] rounded-full bg-white/25 blur-[1px]" />
        <div className="absolute left-[12%] top-[18%] h-[54%] w-[28%] rounded-xl bg-white/12" />
      </div>
    )
  }

  if (item.type === "IMAGE") {
    return (
      <div className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(180deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[length:12px_12px]">
        <div className="absolute inset-x-4 bottom-3 h-5 rounded border border-border bg-background/70" />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-surface-muted">
      <MediaFileIcon type={item.type} />
    </div>
  )
}

function MediaCard({ item }: { item: StudioProjectMediaItem }) {
  const { seekToTime, selectedItem, selectedTargetId, setSelectedItemId } =
    useStudioEditor()
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

export function MediaPanel() {
  const { project } = useStudioEditor()
  const [activeFilter, setActiveFilter] = useState<MediaFilter>("ALL")
  const mediaItems = project.projectMedia.filter((item) => item.type !== "SUBTITLE")
  const filteredItems = useMemo(() => {
    if (activeFilter === "ALL") {
      return mediaItems
    }

    return mediaItems.filter((item) => item.type === activeFilter)
  }, [activeFilter, mediaItems])

  return (
    <StudioPanelShell title="Media">
      <div className="flex flex-1 flex-col overflow-auto p-4">
        <div className="rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center">
          <CloudUpload className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            Drag files here or click to upload
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-4 w-full"
        >
          <Library className="size-4" />
          Imported from Media Library
        </Button>

        <div className="mt-5 grid grid-cols-4 border-b border-border">
          {mediaFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={cn(
                "relative h-9 text-xs font-medium transition",
                activeFilter === filter.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {filter.label}
              {activeFilter === filter.value ? (
                <span className="absolute inset-x-1 bottom-0 h-px bg-foreground" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
          {filteredItems.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </StudioPanelShell>
  )
}
