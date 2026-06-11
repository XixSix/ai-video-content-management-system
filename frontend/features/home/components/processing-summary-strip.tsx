import Link from "next/link"
import { Activity, AlertCircle, CheckCircle2, Clock3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { ProcessingSummary } from "@/features/home/home.types"

type ProcessingSummaryStripProps = {
  summary: ProcessingSummary
}

const summaryMetrics = [
  {
    key: "activeCount",
    label: "Active",
    icon: Activity,
  },
  {
    key: "queuedCount",
    label: "Queued",
    icon: Clock3,
  },
  {
    key: "completedTodayCount",
    label: "Completed today",
    icon: CheckCircle2,
  },
  {
    key: "failedCount",
    label: "Failed",
    icon: AlertCircle,
  },
] as const

export function ProcessingSummaryStrip({
  summary,
}: ProcessingSummaryStripProps) {
  const hasActiveWork = summary.activeCount > 0 || summary.queuedCount > 0

  return (
    <Card className="border-border/70 bg-muted/30 py-0">
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {hasActiveWork
              ? "Processing is in motion across your workspace."
              : "No active processing right now."}
          </p>
          <p className="text-sm text-muted-foreground">
            Keep an eye on what is queued, what completed today, and where a
            failed step may need another pass.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {summaryMetrics.map(({ key, label, icon: Icon }) => (
              <div
                key={key}
                className="min-w-26 rounded-lg border border-border/60 bg-background/80 px-3 py-2"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="size-3.5" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.08em]">
                    {label}
                  </span>
                </div>
                <div className="mt-2 text-lg font-semibold text-foreground">
                  {summary[key]}
                </div>
              </div>
            ))}
          </div>

          <Button variant="ghost" size="sm" asChild>
            <Link href="/media-library">View media</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
