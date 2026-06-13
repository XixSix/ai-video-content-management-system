import { AlertCircle, CalendarClock, CheckCircle2, FilePenLine, Radio } from "lucide-react"

import type { PublishStatusCount } from "../publishing.types"

type PublishingStatusStripProps = {
  counts: PublishStatusCount[]
  publishedThisWeek: number
}

const iconMap = {
  DRAFT: FilePenLine,
  SCHEDULED: CalendarClock,
  PUBLISHING: Radio,
  FAILED: AlertCircle,
  PUBLISHED: CheckCircle2,
} as const

export function PublishingStatusStrip({
  counts,
  publishedThisWeek,
}: PublishingStatusStripProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {counts.map((item) => {
        const Icon = iconMap[item.status]
        const value =
          item.status === "PUBLISHED" ? publishedThisWeek : item.value
        const label =
          item.status === "PUBLISHED" ? "Published this week" : item.label

        return (
          <div
            key={item.status}
            className="flex min-h-24 items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/95 p-4 shadow-[var(--shadow-natural-xs)]"
          >
            <div className="space-y-1">
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {value}
              </p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
            <span className="inline-flex size-10 items-center justify-center rounded-xl border border-border/70 bg-muted/70 text-muted-foreground">
              <Icon className="size-4" />
            </span>
          </div>
        )
      })}
    </section>
  )
}
