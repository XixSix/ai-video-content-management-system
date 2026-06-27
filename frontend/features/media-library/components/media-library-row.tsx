import Link from "next/link"
import Image from "next/image"
import {
  AudioWaveform,
  Clapperboard,
  FileText,
  ImageIcon,
  PlayCircle,
  UploadCloud,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { MediaLibraryItem } from "../types/media-library.types"
import {
  formatDuration,
  formatFileSize,
  formatShortDate,
} from "../utils/media-library.utils"
import { MediaLibraryActionsMenu } from "./media-library-actions-menu"

type MediaLibraryRowProps = {
  eagerThumbnail?: boolean
  item: MediaLibraryItem
  onOpen?: (item: MediaLibraryItem) => void
  onRename?: (itemId: string, title: string) => void
  onDelete?: (item: MediaLibraryItem) => void
  onDownload?: (item: MediaLibraryItem) => void
  onRetry?: (item: MediaLibraryItem) => void
  onDismiss?: (item: MediaLibraryItem) => void
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

function MediaRowPreview({
  eagerThumbnail,
  item,
}: {
  eagerThumbnail?: boolean
  item: MediaLibraryItem
}) {
  const thumbnailUrl = item.thumbnailUrl ?? (item.type === "IMAGE" ? item.assetUrl : null)

  return (
    <div
      className="relative flex aspect-video w-full max-w-48 shrink-0 items-end justify-end overflow-hidden rounded-xl border border-border/60 p-3 lg:w-48"
      style={{ backgroundImage: thumbnailUrl ? undefined : getMediaBackground(item.type) }}
    >
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt=""
          fill
          loading={eagerThumbnail ? "eager" : undefined}
          sizes="12rem"
          className="absolute inset-0 object-cover"
        />
      ) : null}
      <span className="relative z-10 inline-flex size-9 items-center justify-center rounded-lg border border-white/15 bg-neutral-950/55 text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-md">
        {renderMediaIcon(item.type)}
      </span>
    </div>
  )
}

export function MediaLibraryRow({
  eagerThumbnail = false,
  item,
  onOpen,
  onRename,
  onDelete,
  onDownload,
  onRetry,
  onDismiss,
  actionLabel = "Open Studio",
}: MediaLibraryRowProps) {
  const isUploading = item.status === "UPLOADING" && !item.uploadInterrupted
  const content = (
    <>
      <MediaRowPreview eagerThumbnail={eagerThumbnail} item={item} />

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
        {item.uploadInterrupted ? (
          <p className="text-xs leading-5 text-amber-600 dark:text-amber-400">
            Upload interrupted. Remove this record and upload the source again.
          </p>
        ) : item.uploadError ? (
          <p className="text-xs leading-5 text-destructive">{item.uploadError}</p>
        ) : null}
      </div>
    </>
  )
  const primaryContent = isUploading ? (
    <div className="flex min-w-0 flex-1 items-start gap-4 rounded-lg">
      {content}
    </div>
  ) : onOpen ? (
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
  )

  return (
    <Card
      className={`border-border/70 bg-card/95 py-0 shadow-[var(--shadow-card)] ${
        isUploading ? "uploading-shell relative isolate" : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {primaryContent}

          <div className="flex items-center justify-between gap-3 lg:w-auto">
            {isUploading ? (
              <Button size="sm" disabled>
                <UploadCloud className="size-4" />
                Uploading
              </Button>
            ) : onOpen ? (
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
            <MediaLibraryActionsMenu
              item={item}
              onRename={
                item.libraryGroup === "ORIGINAL"
                  ? (title) => onRename?.(item.id, title)
                  : undefined
              }
              onDelete={() => onDelete?.(item)}
              onDownload={() => onDownload?.(item)}
              onRetry={() => onRetry?.(item)}
              onDismiss={() => onDismiss?.(item)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
