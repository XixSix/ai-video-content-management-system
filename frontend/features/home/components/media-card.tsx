import Link from "next/link"
import { AudioWaveform, Clapperboard, PlayCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatDuration, formatShortDate } from "@/features/home/home.utils"
import type { RecentMediaItem } from "@/features/home/home.types"

type MediaCardProps = {
  item: RecentMediaItem
}

export function MediaCard({ item }: MediaCardProps) {
  const MediaIcon = item.type === "VIDEO" ? Clapperboard : AudioWaveform

  return (
    <Card className="border-border/70 bg-card/95 py-0 transition-all hover:-translate-y-0.5 hover:ring-foreground/15">
      <div className="border-b border-border/60 p-3">
        <div
          className="relative aspect-video overflow-hidden rounded-lg border border-border/60 bg-muted"
          style={{
            backgroundImage:
              "linear-gradient(135deg, color-mix(in srgb, var(--surface-inset) 94%, transparent), color-mix(in srgb, var(--surface-muted) 88%, transparent))",
          }}
        >
          <div className="absolute inset-0 flex flex-col justify-between p-3">
            <div className="flex items-start justify-between gap-3">
              <Badge variant="neutral">{item.type}</Badge>
              <StatusBadge status={item.status} />
            </div>

            <div className="flex items-end justify-between gap-3 text-foreground">
              <span className="inline-flex size-10 items-center justify-center rounded-xl border border-border/60 bg-background/85">
                <MediaIcon className="size-4" />
              </span>
              <span className="text-xs font-medium text-foreground-subtle">
                {formatDuration(item.duration)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <CardHeader className="gap-2 pb-3">
        <CardTitle className="line-clamp-2 text-[15px]">{item.title}</CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Updated {formatShortDate(item.updatedAt)}</span>
          <span className="text-border">•</span>
          <span>{item.type === "VIDEO" ? "Source video" : "Source audio"}</span>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant={item.hasTranscript ? "success" : "neutral"}>
            Transcript
          </Badge>
          <Badge variant={item.hasChapters ? "success" : "neutral"}>
            Chapters
          </Badge>
          <Badge variant={item.hasClips ? "success" : "neutral"}>Clips</Badge>
        </div>
      </CardContent>

      <CardFooter className="justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/media">View media</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/studio">
            <PlayCircle className="size-4" />
            Open Studio
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
