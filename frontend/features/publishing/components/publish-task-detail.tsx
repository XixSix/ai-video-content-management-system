import {
  AlertCircle,
  CalendarClock,
  ExternalLink,
  Hash,
  Send,
} from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { PublishTask } from "../publishing.types"
import { formatDateTime, formatPlatform } from "../publishing.utils"
import type { PublishTaskAction } from "./publish-task-list"
import { PublishThumbnail } from "./publish-thumbnail"
import { PublishingPlatformIcon } from "./publishing-platform-icon"

type PublishTaskDetailProps = {
  task: PublishTask | null
  onTaskAction: (task: PublishTask, action: PublishTaskAction) => void
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-b-0">
      <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <span className="max-w-48 text-right text-sm text-foreground">{value}</span>
    </div>
  )
}

export function PublishTaskDetail({ task, onTaskAction }: PublishTaskDetailProps) {
  if (!task) {
    return (
      <Card className="border-border/70 bg-card/95">
        <CardContent className="flex min-h-80 flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-muted/70">
            <Send className="size-5 text-muted-foreground" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Select a publish task
            </p>
            <p className="text-sm text-muted-foreground">
              Details, platform content, and recovery actions appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/70 bg-card/95 shadow-[var(--shadow-panel)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex items-start gap-3">
          <PublishThumbnail task={task} compact />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={task.status} />
              <Badge variant="neutral">{task.sourceType === "SHORT_CLIP" ? "Short clip" : "Source media"}</Badge>
            </div>
            <CardTitle className="line-clamp-2 text-base">
              {task.title ?? task.sourceTitle}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{task.sourceMeta}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-4">
        <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <PublishingPlatformIcon platform={task.platform} size={18} />
              {formatPlatform(task.platform)}
            </span>
            <span className="text-xs text-muted-foreground">
              {task.platformAccountName}
            </span>
          </div>
          <p className="text-sm leading-6 text-foreground">
            {task.caption ?? "No caption has been drafted for this publish task."}
          </p>
          {task.hashtags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {task.hashtags.map((hashtag) => (
                <Badge key={hashtag} variant="neutral">
                  <Hash className="size-3" />
                  {hashtag.replace(/^#/, "")}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {task.status === "FAILED" && task.errorMessage ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-4 text-destructive" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-destructive">
                  Publishing failed
                </p>
                <p className="text-sm leading-5 text-destructive">
                  {task.errorMessage}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {task.status === "PUBLISHING" && task.progress ? (
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-sky-700 dark:text-sky-300">
                Publishing in progress
              </span>
              <span className="tabular-nums text-sky-700 dark:text-sky-300">
                {task.progress}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background/80">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-border/70 px-4">
          <DetailRow label="Scheduled" value={formatDateTime(task.scheduledAt)} />
          <DetailRow label="Published" value={formatDateTime(task.publishedAt)} />
          <DetailRow label="Created" value={formatDateTime(task.createdAt)} />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {task.status === "DRAFT" ? (
            <>
              <Button
                variant="secondary"
                onClick={() => onTaskAction(task, "schedule")}
              >
                <CalendarClock className="size-4" />
                Schedule
              </Button>
              <Button onClick={() => onTaskAction(task, "publish-now")}>
                <Send className="size-4" />
                Publish now
              </Button>
            </>
          ) : null}
          {task.status === "FAILED" ? (
            <Button variant="secondary" onClick={() => onTaskAction(task, "retry")}>
              Retry publish
            </Button>
          ) : null}
          {task.status === "PUBLISHED" && task.platformPostUrl ? (
            <Button
              variant="outline"
              onClick={() => onTaskAction(task, "view-platform")}
            >
              <ExternalLink className="size-4" />
              View on platform
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
