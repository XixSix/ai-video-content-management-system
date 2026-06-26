"use client"

import Link from "next/link"
import { AlertCircle, ArrowUpRight, Clock3 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ProcessingSummaryStrip } from "@/features/home/components/processing-summary-strip"
import type { ProcessingSummary } from "@/features/home/home.types"
import { useJobs } from "@/features/jobs/use-jobs"
import type {
  ProcessingJobData,
  ProcessingJobStatus,
} from "@/features/jobs/job.types"

const terminalStatuses: ProcessingJobStatus[] = [
  "COMPLETED",
  "FAILED",
  "CANCELED",
]
const queuedStatuses: ProcessingJobStatus[] = ["PENDING", "QUEUED"]

function isToday(value: string | null) {
  if (!value) {
    return false
  }

  const date = new Date(value)
  const now = new Date()

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function getSummary(jobs: ProcessingJobData[]): ProcessingSummary {
  return {
    activeCount: jobs.filter(
      (job) =>
        !terminalStatuses.includes(job.status) &&
        !queuedStatuses.includes(job.status)
    ).length,
    queuedCount: jobs.filter((job) => queuedStatuses.includes(job.status)).length,
    completedTodayCount: jobs.filter(
      (job) => job.status === "COMPLETED" && isToday(job.completedAt)
    ).length,
    failedCount: jobs.filter((job) => job.status === "FAILED").length,
  }
}

function getJobStatusVariant(status: ProcessingJobStatus) {
  if (status === "COMPLETED") return "success" as const
  if (status === "FAILED" || status === "CANCELED") return "danger" as const
  if (queuedStatuses.includes(status)) return "warning" as const
  return "info" as const
}

function formatJobType(jobType: string) {
  return jobType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatJobTime(job: ProcessingJobData) {
  const date = new Date(job.updatedAt)

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function RecentJobsSkeleton() {
  return (
    <Card className="border-border/70 py-0">
      <CardHeader className="px-4 py-4 sm:px-5">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="grid gap-3 px-4 pb-4 sm:px-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

export function RecentJobsSection() {
  const jobsQuery = useJobs({ page: 1, limit: 8 })
  const jobs = jobsQuery.data?.items ?? []
  const summary = getSummary(jobs)

  return (
    <section className="space-y-4">
      <ProcessingSummaryStrip summary={summary} />

      {jobsQuery.isLoading ? (
        <RecentJobsSkeleton />
      ) : jobsQuery.isError ? (
        <Card className="border-border/70 py-0">
          <CardContent className="flex items-start gap-3 p-4 sm:p-5">
            <AlertCircle className="mt-0.5 size-4 text-destructive" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Unable to load recent jobs.
              </p>
              <p className="text-sm text-muted-foreground">
                Check the API connection and try again.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70 py-0">
          <CardHeader className="flex flex-row items-center justify-between px-4 py-4 sm:px-5">
            <div>
              <CardTitle className="text-base">Recent jobs</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Latest background work across transcript, chapters, clips, and exports.
              </p>
            </div>
            <Clock3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-5">
            {jobs.length < 1 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No processing jobs yet. Upload media or start an AI workflow to see jobs here.
              </div>
            ) : (
              <div className="grid gap-2">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">
                          {formatJobType(job.jobType)}
                        </p>
                        <Badge variant={getJobStatusVariant(job.status)}>
                          {job.status.replaceAll("_", " ")}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Updated {formatJobTime(job)}
                        {typeof job.progress === "number"
                          ? ` · ${job.progress}%`
                          : ""}
                      </p>
                    </div>

                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/media-library?job=${job.id}`}>
                        View job
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  )
}
