import Link from "next/link"
import Image from "next/image"
import {
  AudioWaveform,
  Clapperboard,
  FileText,
  ImageIcon,
} from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { MediaLibraryItem } from "../types/media-library.types"
import { MediaLibraryActionsMenu } from "./media-library-actions-menu"

type MediaLibraryCardProps = {
  eagerThumbnail?: boolean
  href?: string
  item: MediaLibraryItem
  onOpen?: (item: MediaLibraryItem) => void
  onRename?: (itemId: string, title: string) => void
  onDelete?: (item: MediaLibraryItem) => void
  onDownload?: (item: MediaLibraryItem) => void
  onRetry?: (item: MediaLibraryItem) => void
  onDismiss?: (item: MediaLibraryItem) => void
  showActions?: boolean
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

function MediaPreviewFrame({
  eagerThumbnail,
  item,
}: {
  eagerThumbnail?: boolean
  item: MediaLibraryItem
}) {
  const thumbnailUrl = item.thumbnailUrl ?? (item.type === "IMAGE" ? item.assetUrl : null)

  return (
    <div
      className="relative aspect-video overflow-hidden rounded-t-[inherit] border-b border-border/60 bg-muted"
      style={{ backgroundImage: thumbnailUrl ? undefined : getMediaBackground(item.type) }}
    >
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt=""
          fill
          loading={eagerThumbnail ? "eager" : undefined}
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div className="absolute inset-0 flex items-end justify-end p-3 text-foreground">
        <span className="inline-flex size-9 items-center justify-center rounded-lg border border-white/15 bg-neutral-950/55 text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-md">
          {renderMediaIcon(item.type)}
        </span>
      </div>
    </div>
  )
}

export function MediaLibraryCard({
  eagerThumbnail = false,
  href,
  item,
  onOpen,
  onRename,
  onDelete,
  onDownload,
  onRetry,
  onDismiss,
  showActions = true,
}: MediaLibraryCardProps) {
  const isUploading = item.status === "UPLOADING" && !item.uploadInterrupted
  const openItem = () => onOpen?.(item)
  const defaultHref = href ?? "/studio"

  if (isUploading) {
    return (
      <Card className="uploading-shell border-border/70 bg-card/95 py-0 shadow-[var(--shadow-card)]">
        <div className="border-b border-border/60">
          <div className="relative aspect-video overflow-hidden rounded-t-[inherit] bg-black/90">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="uploading-spinner size-7 rounded-full" />
              <p className="text-[13px] font-medium text-white/80">
                Uploading media…{" "}
                <span className="text-emerald-400">
                  {item.uploadProgress ?? 0}%
                </span>
              </p>
            </div>

            <div className="absolute inset-x-0 bottom-0 h-0.5">
              <div
                className="upload-progress-bar h-full transition-[width] duration-500 ease-out"
                style={{ width: `${item.uploadProgress ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        <CardHeader className="gap-2 pb-4">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="line-clamp-2 text-[15px]">
              {item.title}
            </CardTitle>
            {showActions ? (
              <MediaLibraryActionsMenu
                item={item}
                onRename={
                  item.libraryGroup === "ORIGINAL"
                    ? (title) => onRename?.(item.id, title)
                    : undefined
                }
                onDelete={() => onDelete?.(item)}
              />
            ) : null}
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-border/70 bg-card/95 py-0 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]">
      {href ? (
        <Link href={href} className="block border-b border-border/60">
          <MediaPreviewFrame eagerThumbnail={eagerThumbnail} item={item} />
        </Link>
      ) : onOpen ? (
        <button
          type="button"
          className="block w-full border-b border-border/60 text-left"
          onClick={openItem}
        >
          <MediaPreviewFrame eagerThumbnail={eagerThumbnail} item={item} />
        </button>
      ) : (
        <Link href={defaultHref} className="block border-b border-border/60">
          <MediaPreviewFrame eagerThumbnail={eagerThumbnail} item={item} />
        </Link>
      )}

      <CardHeader className="gap-2 pb-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="line-clamp-2 text-[15px]">
            {href ? (
              <Link href={href} className="hover:text-foreground-subtle">
                {item.title}
              </Link>
            ) : onOpen ? (
              <button
                type="button"
                className="text-left hover:text-foreground-subtle"
                onClick={openItem}
              >
                {item.title}
              </button>
            ) : (
              <Link href={defaultHref} className="hover:text-foreground-subtle">
                {item.title}
              </Link>
            )}
          </CardTitle>
          {showActions ? (
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
          ) : null}
        </div>
        {item.uploadInterrupted ? (
          <p className="text-xs leading-5 text-amber-600 dark:text-amber-400">
            Upload was interrupted. Delete this record and upload the file again.
          </p>
        ) : item.uploadError ? (
          <p className="line-clamp-2 text-xs leading-5 text-destructive">
            {item.uploadError}
          </p>
        ) : null}
      </CardHeader>
    </Card>
  )
}
