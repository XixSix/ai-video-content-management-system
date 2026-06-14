import type {
  MediaLibraryItem,
  MediaLibrarySortKey,
  MediaLibraryTab,
  MediaStatusFilter,
  MediaTypeFilter,
} from "./media-library.types"

type MediaLibraryFilterState = {
  searchQuery: string
  activeTab: MediaLibraryTab
  typeFilter: MediaTypeFilter
  statusFilter: MediaStatusFilter
  sortKey: MediaLibrarySortKey
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds && seconds !== 0) {
    return "Pending"
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }

  const megabytes = bytes / (1024 * 1024)

  if (megabytes >= 1024) {
    return `${(megabytes / 1024).toFixed(1)} GB`
  }

  return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`
}

export function filterAndSortMediaItems(
  items: MediaLibraryItem[],
  filters: MediaLibraryFilterState
) {
  const query = filters.searchQuery.trim().toLowerCase()

  const filteredItems = items.filter((item) => {
    const matchesQuery =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.originalFilename.toLowerCase().includes(query)

    const matchesType =
      filters.typeFilter === "ALL" || item.type === filters.typeFilter

    const matchesStatus =
      filters.statusFilter === "ALL" || item.status === filters.statusFilter

    const matchesTab =
      filters.activeTab === "ALL" ||
      (filters.activeTab === "ORIGINAL" && item.libraryGroup === "ORIGINAL") ||
      (filters.activeTab === "EDITOR_OUTPUTS" &&
        item.libraryGroup === "EDITOR_OUTPUT") ||
      (filters.activeTab === "LONG_TO_SHORT" &&
        item.libraryGroup === "ORIGINAL" &&
        Boolean(item.longToShortSourceId))

    return matchesQuery && matchesType && matchesStatus && matchesTab
  })

  return filteredItems.sort((left, right) => {
    switch (filters.sortKey) {
      case "oldest":
        return (
          new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()
        )
      case "name":
        return left.title.localeCompare(right.title)
      case "duration":
        return (right.duration ?? -1) - (left.duration ?? -1)
      case "newest":
      default:
        return (
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        )
    }
  })
}
