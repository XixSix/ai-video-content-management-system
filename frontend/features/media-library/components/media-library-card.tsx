import Link from "next/link"
import {
  AudioWaveform,
  Clapperboard,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { MediaLibraryItem } from "../media-library.types"
import { MediaLibraryActionsMenu } from "./media-library-actions-menu"

type MediaLibraryCardProps = {
  item: MediaLibraryItem
}

export function MediaLibraryCard({ item }: MediaLibraryCardProps) {
  const MediaIcon = item.type === "VIDEO" ? Clapperboard : AudioWaveform
  const isUploading = item.status === "UPLOADING"

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
            <MediaLibraryActionsMenu />
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-border/70 bg-card/95 py-0 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]">
      <Link href="/studio" className="block border-b border-border/60">
        <div
          className="relative aspect-video overflow-hidden rounded-t-[inherit] border-b border-border/60 bg-muted"
          style={{
            backgroundImage:
              item.type === "VIDEO"
                ? "linear-gradient(135deg, color-mix(in srgb, var(--surface-inset) 94%, transparent), color-mix(in srgb, var(--surface-muted) 88%, transparent))"
                : "linear-gradient(135deg, color-mix(in srgb, var(--surface-raised) 86%, transparent), color-mix(in srgb, var(--surface-inset) 92%, transparent))",
          }}
        >
          <div className="absolute inset-0 flex flex-col justify-between p-3">
            <div className="flex items-start justify-between gap-3">
              <Badge variant="neutral">{item.type}</Badge>
            </div>

            <div className="flex items-end justify-start gap-3 text-foreground">
              <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-background/85">
                <MediaIcon className="size-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>

      <CardHeader className="gap-2 pb-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="line-clamp-2 text-[15px]">
            <Link href="/studio" className="hover:text-foreground-subtle">
              {item.title}
            </Link>
          </CardTitle>
          <MediaLibraryActionsMenu />
        </div>
      </CardHeader>
    </Card>
  )
}
