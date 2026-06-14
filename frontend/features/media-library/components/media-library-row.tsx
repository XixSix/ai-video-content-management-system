import Link from "next/link"
import {
  AudioWaveform,
  Clapperboard,
  FileText,
  ImageIcon,
  PlayCircle,
  UploadCloud,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { MediaLibraryItem } from "../media-library.types"
import {
  formatDuration,
  formatFileSize,
  formatShortDate,
} from "../media-library.utils"
import { MediaLibraryActionsMenu } from "./media-library-actions-menu"

type MediaLibraryRowProps = {
  item: MediaLibraryItem
  onOpen?: (item: MediaLibraryItem) => void
  actionLabel?: string
}

function renderMediaIcon(type: MediaLibraryItem["type"]) {
  if (type === "AUDIO") {
    return <AudioWaveform className="size-4" />
  }

  if (type === "IMAGE") {
    return <ImageIcon className="size-4" />
  }

  if (type === "TRANSCRIPT") {
    return <FileText className="size-4" />
  }

  return <Clapperboard className="size-4" />
}

function getMediaBackground(type: MediaLibraryItem["type"]) {
  if (type === "VIDEO") {
    return "linear-gradient(135deg, color-mix(in srgb, var(--surface-inset) 94%, transparent), color-mix(in srgb, var(--surface-muted) 88%, transparent))"
  }

  return "linear-gradient(135deg, color-mix(in srgb, var(--surface-raised) 86%, transparent), color-mix(in srgb, var(--surface-inset) 92%, transparent))"
}

export function MediaLibraryRow({
  item,
  onOpen,
  actionLabel = "Open Studio",
}: MediaLibraryRowProps) {
  const isUploading = item.status === "UPLOADING"
  const content = (
    <>
      <div
        className="relative flex aspect-video w-full max-w-48 shrink-0 items-end justify-between overflow-hidden rounded-xl border border-border/60 p-3 lg:w-48"
        style={{ backgroundImage: getMediaBackground(item.type) }}
      >
        <Badge variant="neutral">{item.type}</Badge>
        <span className="inline-flex size-10 items-center justify-center rounded-xl border border-border/60 bg-background/85">
          {renderMediaIcon(item.type)}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="min-w-0 space-y-1">
          <p className="line-clamp-1 text-sm font-semibold text-foreground">
            {item.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {item.originalFilename}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.duration !== null ? <span>{formatDuration(item.duration)}</span> : null}
          {item.duration !== null ? <span className="text-border">•</span> : null}
          <span>{formatFileSize(item.fileSizeBytes)}</span>
          <span className="text-border">•</span>
          <span>Updated {formatShortDate(item.updatedAt)}</span>
        </div>

        {isUploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <UploadCloud className="size-3.5" />
                Uploading media…
              </span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {item.uploadProgress ?? 0}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="upload-progress-bar h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${item.uploadProgress ?? 0}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </>
  )

  return (
    <Card
      className={`border-border/70 bg-card/95 py-0 shadow-[var(--shadow-card)] ${
        isUploading ? "uploading-shell relative isolate" : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {onOpen ? (
            <button
              type="button"
              className="flex min-w-0 flex-1 items-start gap-4 rounded-lg text-left"
              onClick={() => onOpen(item)}
            >
              {content}
            </button>
          ) : (
            <Link
              href="/studio"
              className="flex min-w-0 flex-1 items-start gap-4 rounded-lg"
            >
              {content}
            </Link>
          )}

          <div className="flex items-center justify-between gap-3 lg:w-auto">
            {onOpen ? (
              <Button size="sm" onClick={() => onOpen(item)}>
                <PlayCircle className="size-4" />
                {actionLabel}
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link href="/studio">
                  <PlayCircle className="size-4" />
                  {actionLabel}
                </Link>
              </Button>
            )}
            <MediaLibraryActionsMenu />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
