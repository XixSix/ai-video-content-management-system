"use client"

import { CalendarClock } from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { PublishTask } from "../publishing.types"
import {
  formatDateOnly,
  formatDateTime,
  formatPlatform,
  getCalendarTaskDates,
  getTasksForDate,
} from "../publishing.utils"
import { PublishThumbnail } from "./publish-thumbnail"
import { PublishingPlatformIcon } from "./publishing-platform-icon"

type PublishCalendarViewProps = {
  tasks: PublishTask[]
  selectedDate: Date
  onSelectedDateChange: (date: Date) => void
  selectedTaskId: string | null
  onSelectTask: (task: PublishTask) => void
}

export function PublishCalendarView({
  tasks,
  selectedDate,
  onSelectedDateChange,
  selectedTaskId,
  onSelectTask,
}: PublishCalendarViewProps) {
  const eventDates = getCalendarTaskDates(tasks)
  const selectedDateTasks = getTasksForDate(tasks, selectedDate)

  return (
    <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <Card className="border-border/70 bg-card/95 shadow-[var(--shadow-natural-xs)]">
        <CardContent className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                onSelectedDateChange(date)
              }
            }}
            modifiers={{ hasPublishTask: eventDates }}
            modifiersClassNames={{
              hasPublishTask:
                "after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-sky-500",
            }}
            className="mx-auto"
          />
          <div className="mt-3 flex items-center gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
            <span className="inline-block size-1.5 rounded-full bg-sky-500" />
            Dates with scheduled, publishing, or published tasks
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-[var(--shadow-natural-xs)]">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {formatDateOnly(selectedDate)}
              </h2>
              <p className="text-sm text-muted-foreground">
                Scheduled-content view for publishable tasks.
              </p>
            </div>
            <span className="text-sm text-muted-foreground">
              {selectedDateTasks.length} task
              {selectedDateTasks.length === 1 ? "" : "s"}
            </span>
          </div>

          {selectedDateTasks.length > 0 ? (
            <div className="space-y-3">
              {selectedDateTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={cn(
                    "flex w-full cursor-pointer gap-3 rounded-xl border border-border/70 bg-background p-3 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                    selectedTaskId === task.id && "border-foreground/30 bg-muted/50"
                  )}
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
                    <div>
                      <p className="line-clamp-1 text-sm font-semibold text-foreground">
                        {task.title ?? task.sourceTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(task.scheduledAt ?? task.publishedAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-6 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-background">
                <CalendarClock className="size-5 text-muted-foreground" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  No calendar tasks on this date
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Drafts stay in list view. Schedule or publish a task to see it
                  on the calendar.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
