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
import type { RecentMediaItem } from "@/features/home/home.types"

type MediaCardProps = {
  item: RecentMediaItem
}

export function MediaCard({ item }: MediaCardProps) {
  const MediaIcon = item.type === "VIDEO" ? Clapperboard : AudioWaveform

  return (
    <Card className="border-border/70 bg-card/95 py-0 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]">
      <Link href="/media-library" className="block">
        <div
          className="relative aspect-video overflow-hidden rounded-t-[inherit] border-b border-border/60 bg-muted"
          style={{
            backgroundImage:
              "linear-gradient(135deg, color-mix(in srgb, var(--surface-inset) 94%, transparent), color-mix(in srgb, var(--surface-muted) 88%, transparent))",
          }}
        >
          <div className="absolute inset-0 flex flex-col justify-between p-3">
            <div className="flex items-start justify-between gap-3">
              <Badge variant="neutral">{item.type}</Badge>
            </div>

            <div className="flex items-end justify-between gap-3 text-foreground">
              <span className="inline-flex size-10 items-center justify-center rounded-xl border border-border/60 bg-background/85">
                <MediaIcon className="size-4" />
              </span>
            </div>
          </div>
        </div>

        <CardHeader className="gap-2 pb-4">
          <CardTitle className="line-clamp-2 text-[15px] hover:text-foreground-subtle">
            {item.title}
          </CardTitle>
        </CardHeader>
      </Link>
    </Card>
  )
}
