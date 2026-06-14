"use client"

import { useMemo, useState } from "react"
import { Link2, Plus } from "lucide-react"
import { toast } from "sonner"

import { PublishCalendarView } from "@/features/publishing/components/publish-calendar-view"
import { PublishFormSheet } from "@/features/publishing/components/publish-form-sheet"
import {
  PublishTaskList,
  type PublishTaskAction,
} from "@/features/publishing/components/publish-task-list"
import {
  PublishTaskDetail,
  type PublishTaskContentUpdate,
  type PublishTaskDetailMode,
} from "@/features/publishing/components/publish-task-detail"
import { PublishingStatusStrip } from "@/features/publishing/components/publishing-status-strip"
import { PublishingToolbar } from "@/features/publishing/components/publishing-toolbar"
import { Button } from "@/components/ui/button"
import { useSocialAccountsStore } from "@/features/social-accounts/social-accounts.store"
import { publishTasksSeed } from "@/features/publishing/publishing.data"
import type {
  NewPublishPayload,
  PublishPlatformFilter,
  PublishSortKey,
  PublishStatusFilter,
  PublishTask,
  PublishViewMode,
} from "@/features/publishing/publishing.types"
import {
  buildScheduledIso,
  filterAndSortPublishTasks,
  getPublishedThisWeekCount,
  getPublishStatusCounts,
  isFutureScheduledTime,
} from "@/features/publishing/publishing.utils"

function buildPublishTasks(payload: NewPublishPayload): PublishTask[] {
  const now = new Date()
  const scheduledAt =
    payload.status === "DRAFT" || !payload.scheduledDate
      ? null
      : buildScheduledIso(payload.scheduledDate, payload.scheduledTime)

  return payload.targets.map((target, index) => ({
    id: `publish-${now.getTime()}-${index}`,
    mediaId: payload.source.mediaId,
    shortClipId: payload.source.shortClipId,
    sourceType: payload.source.sourceType,
    thumbnailUrl: payload.source.thumbnailUrl,
    sourceTitle: payload.source.title,
    sourceMeta: payload.source.meta,
    aspectRatio: payload.source.aspectRatio,
    durationLabel: payload.source.durationLabel,
    platform: target.account.platform,
    platformAccountName: target.account.accountName,
    title: target.title || null,
    caption: target.caption || null,
    hashtags: target.hashtags,
    status: payload.status,
    progress: payload.status === "PUBLISHING" ? 18 : null,
    scheduledAt,
    publishedAt: null,
    platformPostUrl: null,
    errorMessage: null,
    createdAt: now.toISOString(),
  }))
}

export default function PublishingPage() {
  const [tasks, setTasks] = useState<PublishTask[]>(publishTasksSeed)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<PublishStatusFilter>("ALL")
  const [platformFilter, setPlatformFilter] =
    useState<PublishPlatformFilter>("ALL")
  const [sortKey, setSortKey] = useState<PublishSortKey>("newest")
  const [viewMode, setViewMode] = useState<PublishViewMode>("list")
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    publishTasksSeed[0]?.id ?? null
  )
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(
    new Date("2026-06-13T00:00:00.000Z")
  )
  const [isPublishSheetOpen, setIsPublishSheetOpen] = useState(false)
  const [detailMode, setDetailMode] = useState<PublishTaskDetailMode>("view")
  const setSocialAccountsOpen = useSocialAccountsStore(
    (state) => state.setManagerOpen
  )

  const visibleTasks = useMemo(
    () =>
      filterAndSortPublishTasks(tasks, {
        searchQuery,
        statusFilter,
        platformFilter,
        sortKey,
      }),
    [platformFilter, searchQuery, sortKey, statusFilter, tasks]
  )

  const selectedTask =
    tasks.find((task) => task.id === selectedTaskId) ?? visibleTasks[0] ?? null

  const statusCounts = useMemo(() => getPublishStatusCounts(tasks), [tasks])
  const publishedThisWeek = useMemo(
    () => getPublishedThisWeekCount(tasks),
    [tasks]
  )

  const resetFilters = () => {
    setSearchQuery("")
    setStatusFilter("ALL")
    setPlatformFilter("ALL")
    setSortKey("newest")
  }

  const selectTask = (task: PublishTask) => {
    setSelectedTaskId(task.id)
    setDetailMode("view")
  }

  const updateTask = (taskId: string, nextTask: Partial<PublishTask>) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...nextTask,
            }
          : task
      )
    )
  }

  const handleTaskAction = (task: PublishTask, action: PublishTaskAction) => {
    if (action === "view-platform" && task.platformPostUrl) {
      window.open(task.platformPostUrl, "_blank", "noopener,noreferrer")
      toast.info("Opening platform post", {
        description: task.title ?? task.sourceTitle,
      })
      return
    }

    if (action === "cancel") {
      updateTask(task.id, {
        status: "DRAFT",
        scheduledAt: null,
        progress: null,
      })
      setSelectedTaskId(task.id)
      setDetailMode("view")
      toast.success("Publish cancelled", {
        description: `${task.sourceTitle} moved back to drafts.`,
      })
      return
    }

    if (action === "retry") {
      updateTask(task.id, {
        status: "PUBLISHING",
        progress: 24,
        errorMessage: null,
        scheduledAt: new Date().toISOString(),
      })
      setSelectedTaskId(task.id)
      setDetailMode("view")
      toast.loading("Retrying publish", {
        description: task.title ?? task.sourceTitle,
      })
      return
    }

    if (action === "publish-now") {
      updateTask(task.id, {
        status: "PUBLISHING",
        progress: 18,
        scheduledAt: new Date().toISOString(),
      })
      setSelectedTaskId(task.id)
      setDetailMode("view")
      toast.loading("Publishing started", {
        description: task.title ?? task.sourceTitle,
      })
      return
    }

    if (action === "schedule") {
      if (!task.scheduledAt) {
        setSelectedTaskId(task.id)
        setDetailMode("edit")
        toast.error("Schedule missing", {
          description: "Choose a publish date and time before scheduling.",
        })
        return
      }

      if (!isFutureScheduledTime(task.scheduledAt)) {
        setSelectedTaskId(task.id)
        setDetailMode("edit")
        toast.error("Schedule is in the past", {
          description: "Choose a future publish date and time.",
        })
        return
      }

      updateTask(task.id, {
        status: "SCHEDULED",
        progress: null,
      })
      setSelectedTaskId(task.id)
      setDetailMode("view")
      toast.success("Publish scheduled", {
        description: task.title ?? task.sourceTitle,
      })
      return
    }

    setSelectedTaskId(task.id)
    setDetailMode(action === "edit" ? "edit" : "view")
  }

  const handleSaveTaskContent = (
    task: PublishTask,
    update: PublishTaskContentUpdate
  ) => {
    updateTask(task.id, update)
    setSelectedTaskId(task.id)
    setDetailMode("view")
    toast.success("Publish copy updated", {
      description: task.sourceTitle,
    })
  }

  const handleCreateTask = (payload: NewPublishPayload) => {
    const nextTasks = buildPublishTasks(payload)
    const firstTask = nextTasks[0]

    if (!firstTask) {
      return
    }

    setTasks((currentTasks) => [...nextTasks, ...currentTasks])
    setSelectedTaskId(firstTask.id)
    setDetailMode("view")

    if (payload.status !== "DRAFT") {
      setSelectedCalendarDate(payload.scheduledDate ?? new Date())
    }

    if (payload.status === "DRAFT") {
      toast.success("Draft saved", {
        description: `${payload.source.title} for ${nextTasks.length} account${nextTasks.length > 1 ? "s" : ""}.`,
      })
      return
    }

    if (payload.status === "SCHEDULED") {
      toast.success("Publish scheduled", {
        description: `${payload.source.title} for ${nextTasks.length} account${nextTasks.length > 1 ? "s" : ""}.`,
      })
      return
    }

    toast.loading("Publishing started", {
      description: `${payload.source.title} for ${nextTasks.length} account${nextTasks.length > 1 ? "s" : ""}.`,
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-6 lg:gap-8">
      <section
        className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-[var(--shadow-panel)]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, color-mix(in srgb, var(--surface-raised) 92%, transparent), color-mix(in srgb, var(--surface-muted) 88%, transparent))",
        }}
      >
        <div className="flex flex-col gap-5 px-5 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-7">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-subtle">
              Publishing workspace
            </span>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-[2rem]">
                Publishing
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                Prepare drafts, schedule platform-ready clips, follow publishing
                progress, and recover failed posts without turning the workspace
                into an analytics dashboard.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setSocialAccountsOpen(true)}
            >
              <Link2 className="size-4" />
              Connect account
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={() => setIsPublishSheetOpen(true)}
            >
              <Plus className="size-4" />
              New publish
            </Button>
          </div>
        </div>
      </section>

      <PublishingStatusStrip
        counts={statusCounts}
        publishedThisWeek={publishedThisWeek}
      />

      <PublishingToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        platformFilter={platformFilter}
        onPlatformFilterChange={setPlatformFilter}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {viewMode === "calendar" ? (
        <PublishCalendarView
          tasks={tasks}
          selectedDate={selectedCalendarDate}
          onSelectedDateChange={setSelectedCalendarDate}
          selectedTaskId={selectedTaskId}
          onSelectTask={selectTask}
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-[minmax(24rem,0.95fr)_minmax(24rem,1.05fr)]">
          <PublishTaskList
            tasks={visibleTasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={selectTask}
            onResetFilters={resetFilters}
          />

          <aside>
            <div className="sticky top-24">
              <PublishTaskDetail
                task={selectedTask}
                mode={detailMode}
                onTaskAction={handleTaskAction}
                onEditRequest={(task) => {
                  setSelectedTaskId(task.id)
                  setDetailMode("edit")
                }}
                onCancelEdit={() => setDetailMode("view")}
                onSaveContent={handleSaveTaskContent}
                onInvalidSchedule={() => {
                  toast.error("Schedule is in the past", {
                    description: "Choose a future publish date and time.",
                  })
                }}
              />
            </div>
          </aside>
        </section>
      )}

      <PublishFormSheet
        open={isPublishSheetOpen}
        onOpenChange={setIsPublishSheetOpen}
        onCreate={handleCreateTask}
      />
    </div>
  )
}
