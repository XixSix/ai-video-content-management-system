import Link from "next/link"
import {
  Captions,
  Clapperboard,
  FileStack,
  FileText,
  PlayCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatDuration, formatShortDate } from "@/features/home/home.utils"
import type { RecentOutputItem } from "@/features/home/home.types"

type OutputCardProps = {
  item: RecentOutputItem
}

const kindConfig = {
  TRANSCRIPT: {
    label: "Transcript",
    icon: FileText,
  },
  CHAPTERS: {
    label: "Chapters",
    icon: FileStack,
  },
  CLIP: {
    label: "Clip",
    icon: Clapperboard,
  },
  SUBTITLE: {
    label: "Subtitle",
    icon: Captions,
  },
} as const

export function OutputCard({ item }: OutputCardProps) {
  const config = kindConfig[item.kind]
  const Icon = config.icon

  return (
    <Card className="border-border/70 bg-card/95 py-0">
      <CardContent className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-xl border border-border/70 bg-muted text-foreground">
            <Icon className="size-4" />
          </span>
          <StatusBadge status={item.status} />
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {config.label}
            </p>
            <h3 className="line-clamp-2 text-[15px] font-semibold text-foreground">
              {item.title}
            </h3>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            From {item.sourceMediaTitle}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Updated {formatShortDate(item.updatedAt)}</span>
          {item.duration ? (
            <>
              <span className="text-border">•</span>
              <span>{formatDuration(item.duration)}</span>
            </>
          ) : null}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/studio">
              <PlayCircle className="size-4" />
              Open
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
