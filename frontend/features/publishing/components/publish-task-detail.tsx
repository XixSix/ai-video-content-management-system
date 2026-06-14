"use client"

import { useState } from "react"
import {
  AlertCircle,
  CalendarClock,
  Check,
  ExternalLink,
  Hash,
  Pencil,
  Send,
  X,
  XCircle,
} from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { PublishTask } from "../publishing.types"
import {
  buildScheduledIso,
  formatDateTime,
  formatPlatform,
  isFutureScheduledTime,
} from "../publishing.utils"
import type { PublishTaskAction } from "./publish-task-list"
import { PublishThumbnail } from "./publish-thumbnail"
import { PublishingPlatformIcon } from "./publishing-platform-icon"

export type PublishTaskDetailMode = "view" | "edit"

export type PublishTaskContentUpdate = {
  title: string | null
  caption: string | null
  hashtags: string[]
  scheduledAt: string | null
}

type PublishTaskDetailProps = {
  task: PublishTask | null
  mode?: PublishTaskDetailMode
  onTaskAction: (task: PublishTask, action: PublishTaskAction) => void
  onEditRequest?: (task: PublishTask) => void
  onCancelEdit?: () => void
  onSaveContent?: (task: PublishTask, update: PublishTaskContentUpdate) => void
  onInvalidSchedule?: () => void
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

function parseHashtags(value: string) {
  return value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.startsWith("#") ? item : `#${item}`))
}

function formatScheduleDate(date: Date | undefined) {
  if (!date) {
    return "Select date"
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function parseScheduledDate(value: string | null) {
  return value ? new Date(value) : undefined
}

function parseScheduledTime(value: string | null) {
  if (!value) {
    return "09:00"
  }

  const date = new Date(value)
  const hours = `${date.getHours()}`.padStart(2, "0")
  const minutes = `${date.getMinutes()}`.padStart(2, "0")

  return `${hours}:${minutes}`
}

function PublishTaskEditPanel({
  task,
  onCancelEdit,
  onSaveContent,
  onInvalidSchedule,
}: {
  task: PublishTask
  onCancelEdit?: () => void
  onSaveContent?: (task: PublishTask, update: PublishTaskContentUpdate) => void
  onInvalidSchedule?: () => void
}) {
  const [title, setTitle] = useState(task.title ?? task.sourceTitle)
  const [caption, setCaption] = useState(task.caption ?? "")
  const [hashtags, setHashtags] = useState(task.hashtags.join(" "))
  const [scheduledDate, setScheduledDate] = useState(
    parseScheduledDate(task.scheduledAt)
  )
  const [scheduledTime, setScheduledTime] = useState(
    parseScheduledTime(task.scheduledAt)
  )

  return (
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

        <div className="space-y-3">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Title</span>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Add a platform title..."
              className="h-10 rounded-xl bg-background"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Caption</span>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Write the post caption..."
              className="min-h-32 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <label className="space-y-1.5">
            <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
              <Hash className="size-3.5 text-muted-foreground" />
              Hashtags
            </span>
            <Input
              value={hashtags}
              onChange={(event) => setHashtags(event.target.value)}
              placeholder="#videoworkflow #shorts"
              className="h-10 rounded-xl bg-background"
            />
          </label>
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
              <CalendarClock className="size-3.5 text-muted-foreground" />
              Schedule
            </span>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    data-empty={!scheduledDate}
                    className="h-10 justify-start rounded-xl bg-background text-left font-normal data-[empty=true]:text-muted-foreground"
                  >
                    <CalendarClock className="size-4" />
                    {formatScheduleDate(scheduledDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="z-[60] w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(event) => setScheduledTime(event.target.value)}
                className="h-10 rounded-xl bg-background"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 px-4">
        <DetailRow label="Scheduled" value={formatDateTime(task.scheduledAt)} />
        <DetailRow label="Published" value={formatDateTime(task.publishedAt)} />
        <DetailRow label="Created" value={formatDateTime(task.createdAt)} />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onCancelEdit}>
          <X className="size-4" />
          Cancel
        </Button>
        <Button
          onClick={() => {
            const scheduledAt = buildScheduledIso(scheduledDate, scheduledTime)

            if (scheduledAt && !isFutureScheduledTime(scheduledAt)) {
              onInvalidSchedule?.()
              return
            }

            onSaveContent?.(task, {
              title: title.trim() || null,
              caption: caption.trim() || null,
              hashtags: parseHashtags(hashtags),
              scheduledAt,
            })
          }}
        >
          <Check className="size-4" />
          Save changes
        </Button>
      </div>
    </CardContent>
  )
}

export function PublishTaskDetail({
  task,
  mode = "view",
  onTaskAction,
  onEditRequest,
  onCancelEdit,
  onSaveContent,
  onInvalidSchedule,
}: PublishTaskDetailProps) {
  const isEditable = task?.status === "DRAFT" || task?.status === "SCHEDULED"
  const isEditing = mode === "edit" && isEditable

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

      {isEditing ? (
        <PublishTaskEditPanel
          key={task.id}
          task={task}
          onCancelEdit={onCancelEdit}
          onSaveContent={onSaveContent}
          onInvalidSchedule={onInvalidSchedule}
        />
      ) : (
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
              <Button variant="outline" onClick={() => onEditRequest?.(task)}>
                <Pencil className="size-4" />
                Edit
              </Button>
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
          {task.status === "SCHEDULED" ? (
            <>
              <Button variant="outline" onClick={() => onEditRequest?.(task)}>
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => onTaskAction(task, "cancel")}
              >
                <XCircle className="size-4" />
                Cancel
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
      )}
    </Card>
  )
}
