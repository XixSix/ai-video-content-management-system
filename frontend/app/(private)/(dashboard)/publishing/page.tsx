"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Link2, LoaderCircle, Plus, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { DataPagination } from "@/components/shared/data-pagination"
import { Button } from "@/components/ui/button"
import { jobService, isTerminalJob } from "@/features/jobs/job.service"
import { useMediaList } from "@/features/media-library/hooks/use-media-list"
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
import {
  useCancelPublishTask,
  useCreatePublishTask,
  usePublishNowTask,
  usePublishTasks,
  useSchedulePublishTask,
  useUpdatePublishTask,
} from "@/features/publishing/hooks/use-publishing"
import { publishingQueryKeys } from "@/features/publishing/hooks/publishing-query-keys"
import {
  mapMediaToPublishSource,
  mapPlatformAccountToPublishOption,
  mapPublishTaskResponse,
} from "@/features/publishing/publishing.mapper"
import type {
  NewPublishPayload,
  PublishTaskStatus,
  PublishPlatformFilter,
  PublishSortKey,
  PublishStatusFilter,
  PublishTask,
  PublishViewMode,
} from "@/features/publishing/publishing.types"
import {
  buildScheduledIso,
  getPublishedThisWeekCount,
  getPublishStatusCounts,
  isFutureScheduledTime,
} from "@/features/publishing/publishing.utils"
import { usePlatformAccounts } from "@/features/social-accounts/hooks/use-platform-accounts"
import { useSocialAccountsStore } from "@/features/social-accounts/social-accounts.store"
import { useWorkspace } from "@/features/workspaces/components/workspace-provider"

const PUBLISHING_PAGE_SIZE = 4

function getSortQuery(sortKey: PublishSortKey): {
  sortBy: "createdAt" | "scheduledAt" | "publishedAt"
  sortOrder: "asc" | "desc"
} {
  if (sortKey === "scheduledSoon") {
    return { sortBy: "scheduledAt", sortOrder: "asc" }
  }

  if (sortKey === "recentlyPublished") {
    return { sortBy: "publishedAt", sortOrder: "desc" }
  }

  return { sortBy: "createdAt", sortOrder: "desc" }
}

export default function PublishingPage() {
  const queryClient = useQueryClient()
  const { selectedWorkspaceId } = useWorkspace()
  const workspaceId = selectedWorkspaceId ?? ""
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<PublishStatusFilter>("ALL")
  const [platformFilter, setPlatformFilter] =
    useState<PublishPlatformFilter>("ALL")
  const [sortKey, setSortKey] = useState<PublishSortKey>("newest")
  const [viewMode, setViewMode] = useState<PublishViewMode>("list")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date())
  const [isPublishSheetOpen, setIsPublishSheetOpen] = useState(false)
  const [detailMode, setDetailMode] = useState<PublishTaskDetailMode>("view")
  const trackedJobsRef = useRef<Map<string, { close: () => void }>>(new Map())
  const setSocialAccountsOpen = useSocialAccountsStore(
    (state) => state.setManagerOpen
  )

  const publishTasksListQuery = useMemo(() => {
    const sortQuery = getSortQuery(sortKey)
    const search = searchQuery.trim()

    return {
      page: currentPage,
      limit: PUBLISHING_PAGE_SIZE,
      ...(search ? { search } : {}),
      ...(statusFilter !== "ALL"
        ? { status: statusFilter as PublishTaskStatus }
        : {}),
      ...(platformFilter !== "ALL" ? { platform: platformFilter } : {}),
      ...sortQuery,
    }
  }, [currentPage, platformFilter, searchQuery, sortKey, statusFilter])

  const publishTasksQuery = usePublishTasks(publishTasksListQuery)
  const mediaQuery = useMediaList(workspaceId, {
    page: 1,
    limit: 25,
    status: "UPLOADED",
    sortBy: "createdAt",
    sortOrder: "desc",
  })
  const accountsQuery = usePlatformAccounts(workspaceId)
  const createTask = useCreatePublishTask()
  const updateTask = useUpdatePublishTask()
  const publishNow = usePublishNowTask()
  const scheduleTask = useSchedulePublishTask()
  const cancelTask = useCancelPublishTask()
  const isMutating =
    createTask.isPending ||
    updateTask.isPending ||
    publishNow.isPending ||
    scheduleTask.isPending ||
    cancelTask.isPending

  const tasks = useMemo(
    () =>
      (publishTasksQuery.data?.items ?? []).map((task) =>
        mapPublishTaskResponse(task)
      ),
    [publishTasksQuery.data?.items]
  )
  const sourceOptions = useMemo(
    () =>
      (mediaQuery.data?.items ?? [])
        .map(mapMediaToPublishSource)
        .filter((source): source is NonNullable<typeof source> =>
          Boolean(source)
        ),
    [mediaQuery.data?.items]
  )
  const accountOptions = useMemo(
    () =>
      (accountsQuery.data?.accounts ?? [])
        .map(mapPlatformAccountToPublishOption)
        .filter((account): account is NonNullable<typeof account> =>
          Boolean(account)
        ),
    [accountsQuery.data?.accounts]
  )

  const totalItems = publishTasksQuery.data?.meta.total ?? 0
  const pageCount = Math.max(1, publishTasksQuery.data?.meta.totalPages ?? 1)
  const safeCurrentPage = Math.min(currentPage, pageCount)
  const selectedTask =
    tasks.find((task) => task.id === selectedTaskId) ??
    tasks[0] ??
    null
  const statusCounts = useMemo(() => getPublishStatusCounts(tasks), [tasks])
  const publishedThisWeek = useMemo(
    () => getPublishedThisWeekCount(tasks),
    [tasks]
  )

  useEffect(() => {
    const stopTracking = (jobId: string) => {
      trackedJobsRef.current.get(jobId)?.close()
      trackedJobsRef.current.delete(jobId)
    }
    const invalidatePublishing = () => {
      void queryClient.invalidateQueries({ queryKey: publishingQueryKeys.all })
    }
    const pollJob = (jobId: string) => {
      let cancelled = false
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      const poll = () => {
        timeoutId = setTimeout(() => {
          void jobService
            .get(jobId)
            .then(({ job }) => {
              if (cancelled) return

              if (isTerminalJob(job)) {
                stopTracking(jobId)
                invalidatePublishing()
                return
              }

              poll()
            })
            .catch(() => {
              if (!cancelled) {
                stopTracking(jobId)
              }
            })
        }, 2500)
      }

      poll()

      return {
        close: () => {
          cancelled = true
          if (timeoutId) clearTimeout(timeoutId)
        },
      }
    }

    tasks
      .filter((task) => task.status === "PUBLISHING" && task.jobId)
      .forEach((task) => {
        const jobId = task.jobId!

        if (trackedJobsRef.current.has(jobId)) {
          return
        }

        let pollingStarted = false
        const subscription = jobService.subscribeToJobEvents({
          jobId,
          onError: () => {
            if (pollingStarted) return
            pollingStarted = true
            trackedJobsRef.current.set(jobId, pollJob(jobId))
          },
          onJob: (job) => {
            if (isTerminalJob(job)) {
              stopTracking(jobId)
              invalidatePublishing()
            }
          },
        })
        trackedJobsRef.current.set(jobId, subscription)
      })

    return () => {
      for (const task of tasks) {
        if (task.jobId && task.status !== "PUBLISHING") {
          stopTracking(task.jobId)
        }
      }
    }
  }, [queryClient, tasks])

  useEffect(
    () => () => {
      trackedJobsRef.current.forEach((subscription) => subscription.close())
      trackedJobsRef.current.clear()
    },
    []
  )

  const resetFilters = () => {
    setSearchQuery("")
    setStatusFilter("ALL")
    setPlatformFilter("ALL")
    setSortKey("newest")
    setCurrentPage(1)
  }

  const selectTask = (task: PublishTask) => {
    setSelectedTaskId(task.id)
    setDetailMode("view")
  }

  const handleTaskAction = async (
    task: PublishTask,
    action: PublishTaskAction
  ) => {
    try {
      if (action === "view-platform" && task.platformPostUrl) {
        window.open(task.platformPostUrl, "_blank", "noopener,noreferrer")
        return
      }

      if (action === "cancel") {
        const response = await cancelTask.mutateAsync(task.id)
        setSelectedTaskId(response.publishTask.id)
        toast.success("Publish canceled", { description: task.sourceTitle })
        return
      }

      if (action === "retry" || action === "publish-now") {
        const response = await publishNow.mutateAsync(task.id)
        setSelectedTaskId(response.publishTask.id)
        toast.loading("Publishing started", { description: task.sourceTitle })
        return
      }

      if (action === "schedule") {
        if (!task.scheduledAt || !isFutureScheduledTime(task.scheduledAt)) {
          setSelectedTaskId(task.id)
          setDetailMode("edit")
          toast.error("Choose a future schedule before publishing.")
          return
        }

        const response = await scheduleTask.mutateAsync({
          publishTaskId: task.id,
          scheduledAt: task.scheduledAt,
        })
        setSelectedTaskId(response.publishTask.id)
        toast.success("Publish scheduled", { description: task.sourceTitle })
        return
      }

      setSelectedTaskId(task.id)
      setDetailMode(action === "edit" ? "edit" : "view")
    } catch (error) {
      toast.error("Publishing action failed", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  const handleSaveTaskContent = async (
    task: PublishTask,
    update: PublishTaskContentUpdate
  ) => {
    try {
      const response = await updateTask.mutateAsync({
        publishTaskId: task.id,
        input: update,
      })
      setSelectedTaskId(response.publishTask.id)
      setDetailMode("view")
      toast.success("Publish copy updated", { description: task.sourceTitle })
    } catch (error) {
      toast.error("Could not update publish copy", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  const handleCreateTask = async (payload: NewPublishPayload) => {
    const scheduledAt =
      payload.status === "SCHEDULED"
        ? buildScheduledIso(payload.scheduledDate, payload.scheduledTime)
        : null

    try {
      const createdTasks = []

      for (const target of payload.targets) {
        const createResponse = await createTask.mutateAsync({
          mediaId: payload.source.mediaId ?? undefined,
          projectId: payload.source.projectId ?? undefined,
          shortClipId: payload.source.shortClipId ?? undefined,
          platform: target.account.platform,
          platformAccountId: target.account.id,
          title: target.title || undefined,
          caption: target.caption || undefined,
          hashtags: target.hashtags,
        })
        createdTasks.push(createResponse.publishTask)

        if (payload.status === "PUBLISHING") {
          await publishNow.mutateAsync(createResponse.publishTask.id)
        }

        if (payload.status === "SCHEDULED" && scheduledAt) {
          await scheduleTask.mutateAsync({
            publishTaskId: createResponse.publishTask.id,
            scheduledAt,
          })
        }
      }

      setSelectedTaskId(createdTasks[0]?.id ?? null)

      if (payload.status === "DRAFT") {
        toast.success("Draft saved", { description: payload.source.title })
      } else if (payload.status === "SCHEDULED") {
        toast.success("Publish scheduled", { description: payload.source.title })
      } else {
        toast.loading("Publishing started", { description: payload.source.title })
      }
    } catch (error) {
      toast.error("Could not create publish task", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  const isLoading =
      publishTasksQuery.isLoading || mediaQuery.isLoading || accountsQuery.isLoading
  const loadError =
    publishTasksQuery.error ?? mediaQuery.error ?? accountsQuery.error ?? null
  const hasAccountOptions = accountOptions.length > 0
  const hasSourceOptions = sourceOptions.length > 0
  const newPublishDisabled = !hasAccountOptions || !hasSourceOptions
  const newPublishBlockReason = !hasAccountOptions
    ? "Connect a YouTube or Facebook account before creating publish tasks."
    : !hasSourceOptions
      ? "Upload a ready video in Media Library before creating publish tasks."
      : null

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
                Prepare drafts, schedule connected YouTube and Facebook Page
                posts, follow publishing progress, and recover failed uploads.
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
              disabled={newPublishDisabled}
              title={newPublishBlockReason ?? undefined}
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

      {!isLoading && !loadError && (!hasAccountOptions || !hasSourceOptions) ? (
        <section className="grid gap-3 md:grid-cols-2">
          {!hasAccountOptions ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <Link2 className="mt-0.5 size-4 text-amber-700 dark:text-amber-300" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Connect a publishing account
                  </p>
                  <p className="text-sm leading-5 text-muted-foreground">
                    You need a connected YouTube or Facebook account before
                    creating publish tasks.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          {!hasSourceOptions ? (
            <div className="rounded-xl border border-border/70 bg-card/95 p-4">
              <div className="flex items-start gap-3">
                <Plus className="mt-0.5 size-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Add a ready video source
                  </p>
                  <p className="text-sm leading-5 text-muted-foreground">
                    Upload and complete at least one video in Media Library to
                    use it as a publishing source.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <PublishingToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={(value) => {
          setSearchQuery(value)
          setCurrentPage(1)
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => {
          setStatusFilter(value)
          setCurrentPage(1)
        }}
        platformFilter={platformFilter}
        onPlatformFilterChange={(value) => {
          setPlatformFilter(value)
          setCurrentPage(1)
        }}
        sortKey={sortKey}
        onSortKeyChange={(value) => {
          setSortKey(value)
          setCurrentPage(1)
        }}
        viewMode={viewMode}
        onViewModeChange={(value) => {
          setViewMode(value)
          setCurrentPage(1)
        }}
      />

      {loadError ? (
        <div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-destructive/20 bg-background/70 text-destructive">
            <AlertCircle className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-destructive">
              Could not load publishing workspace
            </p>
            <p className="max-w-md text-sm text-destructive/85">
              {loadError instanceof Error
                ? loadError.message
                : "Refresh the data and try again."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void publishTasksQuery.refetch()
              void mediaQuery.refetch()
              void accountsQuery.refetch()
            }}
          >
            <RotateCcw className="size-4" />
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex min-h-72 items-center justify-center rounded-xl border border-border/70 bg-card/95 text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 size-4 animate-spin" />
          Loading publishing workspace...
        </div>
      ) : viewMode === "calendar" ? (
        <PublishCalendarView
          tasks={tasks}
          selectedDate={selectedCalendarDate}
          onSelectedDateChange={setSelectedCalendarDate}
          selectedTaskId={selectedTaskId}
          onSelectTask={selectTask}
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-[minmax(24rem,0.95fr)_minmax(24rem,1.05fr)]">
          <div className="space-y-4">
            <PublishTaskList
              tasks={tasks}
              selectedTaskId={selectedTask?.id ?? selectedTaskId}
              onSelectTask={selectTask}
              onResetFilters={resetFilters}
            />
            <DataPagination
              page={safeCurrentPage}
              pageSize={PUBLISHING_PAGE_SIZE}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </div>

          <aside>
            <div className="sticky top-24">
              <PublishTaskDetail
                task={selectedTask}
                mode={detailMode}
                onTaskAction={(task, action) => {
                  void handleTaskAction(task, action)
                }}
                onEditRequest={(task) => {
                  setSelectedTaskId(task.id)
                  setDetailMode("edit")
                }}
                onCancelEdit={() => setDetailMode("view")}
                onSaveContent={(task, update) => {
                  void handleSaveTaskContent(task, update)
                }}
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
        accountOptions={accountOptions}
        sourceOptions={sourceOptions}
        isSubmitting={isMutating}
        onOpenChange={setIsPublishSheetOpen}
        onCreate={(payload) => {
          void handleCreateTask(payload)
        }}
      />
    </div>
  )
}
