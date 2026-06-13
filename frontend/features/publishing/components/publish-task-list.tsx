"use client"

import {
  CalendarClock,
  ExternalLink,
  Pencil,
  RefreshCcw,
  Send,
  XCircle,
} from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { PublishTask } from "../publishing.types"
import { formatDateTime, formatPlatform } from "../publishing.utils"
import { PublishThumbnail } from "./publish-thumbnail"
import { PublishingPlatformIcon } from "./publishing-platform-icon"

export type PublishTaskAction =
  | "edit"
  | "schedule"
  | "publish-now"
  | "cancel"
  | "retry"
  | "view-platform"

type PublishTaskListProps = {
  tasks: PublishTask[]
  selectedTaskId: string | null
  onSelectTask: (task: PublishTask) => void
  onTaskAction: (task: PublishTask, action: PublishTaskAction) => void
  onResetFilters: () => void
}

function getDateLabel(task: PublishTask) {
  if (task.status === "PUBLISHED") {
    return `Published ${formatDateTime(task.publishedAt)}`
  }

  if (task.status === "DRAFT") {
    return "No schedule"
  }

  return `Scheduled ${formatDateTime(task.scheduledAt)}`
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="space-y-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-sky-500 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{value}% publishing</p>
    </div>
  )
}

function PublishTaskActions({
  task,
  onTaskAction,
}: {
  task: PublishTask
  onTaskAction: (task: PublishTask, action: PublishTaskAction) => void
}) {
  if (task.status === "DRAFT") {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => onTaskAction(task, "edit")}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onTaskAction(task, "schedule")}
        >
          <CalendarClock className="size-3.5" />
          Schedule
        </Button>
        <Button size="sm" onClick={() => onTaskAction(task, "publish-now")}>
          <Send className="size-3.5" />
          Publish
        </Button>
      </>
    )
  }

  if (task.status === "SCHEDULED") {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => onTaskAction(task, "edit")}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onTaskAction(task, "cancel")}
        >
          <XCircle className="size-3.5" />
          Cancel
        </Button>
      </>
    )
  }

  if (task.status === "FAILED") {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onTaskAction(task, "retry")}
      >
        <RefreshCcw className="size-3.5" />
        Retry
      </Button>
    )
  }

  if (task.status === "PUBLISHED" && task.platformPostUrl) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onTaskAction(task, "view-platform")}
      >
        <ExternalLink className="size-3.5" />
        View
      </Button>
    )
  }

  return null
}

function PublishTaskRow({
  task,
  selected,
  onSelectTask,
  onTaskAction,
}: {
  task: PublishTask
  selected: boolean
  onSelectTask: (task: PublishTask) => void
  onTaskAction: (task: PublishTask, action: PublishTaskAction) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_11rem_9rem_auto] items-center gap-4 rounded-xl border border-border/70 bg-card/95 p-3 text-left shadow-[var(--shadow-natural-xs)] transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        selected && "border-foreground/25 bg-muted/50"
      )}
      onClick={() => onSelectTask(task)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelectTask(task)
        }
      }}
    >
      <PublishThumbnail task={task} />

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <PublishingPlatformIcon platform={task.platform} size={14} />
            {formatPlatform(task.platform)}
          </span>
        </div>
        <div className="space-y-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {task.title ?? task.sourceTitle}
          </p>
          <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
            {task.caption ?? "No caption yet."}
          </p>
        </div>
      </div>

      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-medium text-foreground">
          {task.platformAccountName}
        </p>
        <p className="text-xs text-muted-foreground">{getDateLabel(task)}</p>
      </div>

      <div>
        {task.status === "PUBLISHING" && task.progress ? (
          <ProgressBar value={task.progress} />
        ) : task.status === "FAILED" ? (
          <p className="line-clamp-2 text-xs text-destructive">
            {task.errorMessage}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {task.sourceType === "SHORT_CLIP" ? "Short clip" : "Source media"}
          </p>
        )}
      </div>

      <div
        className="flex flex-wrap justify-end gap-2"
        onClick={(event) => event.stopPropagation()}
      >
        <PublishTaskActions task={task} onTaskAction={onTaskAction} />
      </div>
    </div>
  )
}

function PublishTaskCard({
  task,
  selected,
  onSelectTask,
  onTaskAction,
}: {
  task: PublishTask
  selected: boolean
  onSelectTask: (task: PublishTask) => void
  onTaskAction: (task: PublishTask, action: PublishTaskAction) => void
}) {
  return (
    <Card
      className={cn(
        "border-border/70 bg-card/95 shadow-[var(--shadow-natural-xs)]",
        selected && "ring-foreground/25"
      )}
    >
      <CardContent className="space-y-4 p-4">
        <button
          type="button"
          className="flex w-full cursor-pointer gap-3 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          onClick={() => onSelectTask(task)}
        >
          <PublishThumbnail task={task} compact />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={task.status} />
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <PublishingPlatformIcon platform={task.platform} size={14} />
                {formatPlatform(task.platform)}
              </span>
            </div>
            <div className="space-y-1">
              <p className="line-clamp-2 text-sm font-semibold text-foreground">
                {task.title ?? task.sourceTitle}
              </p>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {task.caption ?? "No caption yet."}
              </p>
            </div>
          </div>
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{getDateLabel(task)}</p>
          {task.status === "PUBLISHING" && task.progress ? (
            <div className="w-32">
              <ProgressBar value={task.progress} />
            </div>
          ) : null}
        </div>

        {task.status === "FAILED" ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            {task.errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <PublishTaskActions task={task} onTaskAction={onTaskAction} />
        </div>
      </CardContent>
    </Card>
  )
}

export function PublishTaskList({
  tasks,
  selectedTaskId,
  onSelectTask,
  onTaskAction,
  onResetFilters,
}: PublishTaskListProps) {
  if (tasks.length < 1) {
    return (
      <Card className="border-border/70 bg-card/95">
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-muted/70">
            <CalendarClock className="size-5 text-muted-foreground" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              No publish tasks match this view
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Reset filters or create a new publish task from an existing media
              item or short clip.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={onResetFilters}>
            Reset filters
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="hidden space-y-3 lg:block">
        {tasks.map((task) => (
          <PublishTaskRow
            key={task.id}
            task={task}
            selected={task.id === selectedTaskId}
            onSelectTask={onSelectTask}
            onTaskAction={onTaskAction}
          />
        ))}
      </div>
      <div className="space-y-3 lg:hidden">
        {tasks.map((task) => (
          <PublishTaskCard
            key={task.id}
            task={task}
            selected={task.id === selectedTaskId}
            onSelectTask={onSelectTask}
            onTaskAction={onTaskAction}
          />
        ))}
      </div>
    </>
  )
}
