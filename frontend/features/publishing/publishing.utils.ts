import type {
  PublishPlatform,
  PublishPlatformFilter,
  PublishSortKey,
  PublishStatusCount,
  PublishStatusFilter,
  PublishTask,
  PublishTaskStatus,
} from "./publishing.types"

export const calendarStatuses: PublishTaskStatus[] = [
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
]

export function getDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function getTaskTimelineDate(task: PublishTask) {
  return task.scheduledAt ?? task.publishedAt ?? task.createdAt
}

export function getTaskCalendarDate(task: PublishTask) {
  const dateValue = task.scheduledAt ?? task.publishedAt

  return dateValue ? new Date(dateValue) : null
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set"
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

export function formatDateOnly(value: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(value)
}

export function formatPlatform(platform: PublishPlatform) {
  const labels: Record<PublishPlatform, string> = {
    YOUTUBE: "YouTube",
    FACEBOOK: "Facebook",
  }

  return labels[platform]
}

export function buildScheduledIso(date: Date | undefined, time: string) {
  if (!date) {
    return null
  }

  const [hours = "9", minutes = "0"] = time.split(":")
  const scheduledDate = new Date(date)
  scheduledDate.setHours(Number(hours), Number(minutes), 0, 0)

  return scheduledDate.toISOString()
}

export function isFutureScheduledTime(value: string | null) {
  return value ? new Date(value).getTime() > Date.now() : false
}

export function formatStatus(status: PublishTaskStatus) {
  const labels: Record<PublishTaskStatus, string> = {
    DRAFT: "Draft",
    SCHEDULED: "Scheduled",
    PUBLISHING: "Publishing",
    PUBLISHED: "Published",
    FAILED: "Failed",
    CANCELED: "Canceled",
  }

  return labels[status]
}

export function filterAndSortPublishTasks(
  tasks: PublishTask[],
  filters: {
    searchQuery: string
    statusFilter: PublishStatusFilter
    platformFilter: PublishPlatformFilter
    sortKey: PublishSortKey
  }
) {
  const normalizedQuery = filters.searchQuery.trim().toLowerCase()

  return tasks
    .filter((task) => {
      const matchesStatus =
        filters.statusFilter === "ALL" ? true : task.status === filters.statusFilter
      const matchesPlatform =
        filters.platformFilter === "ALL"
          ? true
          : task.platform === filters.platformFilter
      const searchableText = [
        task.sourceTitle,
        task.title,
        task.caption,
        task.platformAccountName,
        ...task.hashtags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      const matchesQuery =
        normalizedQuery.length < 1
          ? true
          : searchableText.includes(normalizedQuery)

      return matchesStatus && matchesPlatform && matchesQuery
    })
    .sort((left, right) => {
      if (filters.sortKey === "scheduledSoon") {
        return (
          new Date(left.scheduledAt ?? "9999-12-31").getTime() -
          new Date(right.scheduledAt ?? "9999-12-31").getTime()
        )
      }

      if (filters.sortKey === "recentlyPublished") {
        return (
          new Date(right.publishedAt ?? right.createdAt).getTime() -
          new Date(left.publishedAt ?? left.createdAt).getTime()
        )
      }

      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      )
    })
}

export function getPublishStatusCounts(tasks: PublishTask[]): PublishStatusCount[] {
  const statuses: PublishTaskStatus[] = [
    "DRAFT",
    "SCHEDULED",
    "PUBLISHING",
    "FAILED",
    "CANCELED",
    "PUBLISHED",
  ]

  return statuses.map((status) => ({
    status,
    label: formatStatus(status),
    value: tasks.filter((task) => task.status === status).length,
  }))
}

export function getPublishedThisWeekCount(tasks: PublishTask[]) {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 6)
  const weekEnd = new Date(now)
  weekEnd.setHours(23, 59, 59, 999)

  return tasks.filter((task) => {
    if (!task.publishedAt) {
      return false
    }

    const publishedAt = new Date(task.publishedAt)
    return publishedAt >= weekStart && publishedAt <= weekEnd
  }).length
}

export function getCalendarPublishTasks(tasks: PublishTask[]) {
  return tasks.filter((task) => calendarStatuses.includes(task.status))
}

export function getTasksForDate(tasks: PublishTask[], date: Date) {
  const selectedKey = getDateKey(date)

  return getCalendarPublishTasks(tasks).filter((task) => {
    const taskDate = getTaskCalendarDate(task)

    return taskDate ? getDateKey(taskDate) === selectedKey : false
  })
}

export function getCalendarTaskDates(tasks: PublishTask[]) {
  const keys = new Set<string>()

  return getCalendarPublishTasks(tasks)
    .map((task) => getTaskCalendarDate(task))
    .filter((date): date is Date => {
      if (!date) {
        return false
      }

      const key = getDateKey(date)
      if (keys.has(key)) {
        return false
      }

      keys.add(key)
      return true
    })
}
