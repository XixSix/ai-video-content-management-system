"use client"

import {
  CalendarClock,
  FileVideo2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { PublishTask } from "../publishing.types"

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
  onResetFilters: () => void
}

function getPublishPreviewBackground(task: PublishTask) {
  if (task.sourceType === "SHORT_CLIP") {
    return "linear-gradient(135deg, color-mix(in srgb, var(--surface-inset) 94%, transparent), color-mix(in srgb, var(--surface-muted) 88%, transparent))"
  }

  return "linear-gradient(135deg, color-mix(in srgb, var(--surface-raised) 86%, transparent), color-mix(in srgb, var(--surface-inset) 92%, transparent))"
}

function PublishTaskCard({
  task,
  selected,
  onSelectTask,
}: {
  task: PublishTask
  selected: boolean
  onSelectTask: (task: PublishTask) => void
}) {
  return (
    <Card
      className={cn(
        "border-border/70 bg-card/95 py-0 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]",
        selected && "ring-2 ring-foreground/25"
      )}
    >
      <button
        type="button"
        className="block w-full border-b border-border/60 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        onClick={() => onSelectTask(task)}
      >
        <div
          className="relative aspect-video overflow-hidden rounded-t-[inherit] border-b border-border/60 bg-muted"
          style={{ backgroundImage: getPublishPreviewBackground(task) }}
        >
          <div className="absolute inset-0 flex flex-col justify-between p-3">
            <div className="flex items-start justify-between gap-3">
              <Badge variant="neutral">
                {task.sourceType === "SHORT_CLIP" ? "SHORT CLIP" : "MEDIA"}
              </Badge>
            </div>

            <div className="flex items-end justify-between gap-3 text-foreground">
              <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-background/85">
                <FileVideo2 className="size-4" />
              </span>
              <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
                {task.durationLabel}
              </span>
            </div>
          </div>
        </div>
      </button>

      <CardHeader className="gap-2 pb-4">
        <CardTitle className="line-clamp-2 text-[15px]">
          <button
            type="button"
            className="text-left hover:text-foreground-subtle"
            onClick={() => onSelectTask(task)}
          >
            {task.title ?? task.sourceTitle}
          </button>
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

export function PublishTaskList({
  tasks,
  selectedTaskId,
  onSelectTask,
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
      <div className="hidden grid-cols-2 gap-4 lg:grid">
        {tasks.map((task) => (
          <PublishTaskCard
            key={task.id}
            task={task}
            selected={task.id === selectedTaskId}
            onSelectTask={onSelectTask}
          />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
        {tasks.map((task) => (
          <PublishTaskCard
            key={task.id}
            task={task}
            selected={task.id === selectedTaskId}
            onSelectTask={onSelectTask}
          />
        ))}
      </div>
    </>
  )
}
