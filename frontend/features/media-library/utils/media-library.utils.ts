import type {
  MediaLibraryItem,
  MediaLibrarySortKey,
  MediaLibraryTab,
  MediaTypeFilter,
} from "../types/media-library.types";

type MediaLibraryFilterState = {
  searchQuery: string;
  activeTab: MediaLibraryTab;
  typeFilter: MediaTypeFilter;
  sortKey: MediaLibrarySortKey;
};

export function getMediaItemsForTab(
  realItems: MediaLibraryItem[],
  activeTab: MediaLibraryTab,
) {
  if (activeTab === "ORIGINAL") {
    return realItems.filter((item) => item.libraryGroup === "ORIGINAL");
  }

  if (activeTab === "EDITOR_OUTPUTS") {
    return realItems.filter((item) => item.libraryGroup === "EDITOR_OUTPUT");
  }

  if (activeTab === "LONG_TO_SHORT") {
    return realItems.filter(
      (item) =>
        item.libraryGroup === "ORIGINAL" && Boolean(item.longToShortSourceId),
    );
  }

  return realItems;
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds && seconds !== 0) {
    return "Pending";
  }

  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatFullDateTime(date: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  const megabytes = bytes / (1024 * 1024);

  if (megabytes >= 1024) {
    return `${(megabytes / 1024).toFixed(1)} GB`;
  }

  return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
}

export function filterAndSortMediaItems(
  items: MediaLibraryItem[],
  filters: MediaLibraryFilterState,
) {
  const query = filters.searchQuery.trim().toLowerCase();

  const filteredItems = items.filter((item) => {
    const matchesQuery =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.originalFilename.toLowerCase().includes(query);

    const matchesType =
      filters.typeFilter === "ALL" || item.type === filters.typeFilter;

    const matchesTab =
      filters.activeTab === "ALL" ||
      (filters.activeTab === "ORIGINAL" && item.libraryGroup === "ORIGINAL") ||
      (filters.activeTab === "EDITOR_OUTPUTS" &&
        item.libraryGroup === "EDITOR_OUTPUT") ||
      (filters.activeTab === "LONG_TO_SHORT" &&
        item.libraryGroup === "ORIGINAL" &&
        Boolean(item.longToShortSourceId));

    return matchesQuery && matchesType && matchesTab;
  });

  return filteredItems.sort((left, right) => {
    switch (filters.sortKey) {
      case "oldest":
        return (
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime()
        );
      case "name":
        return left.title.localeCompare(right.title);
      case "duration":
        return (right.duration ?? -1) - (left.duration ?? -1);
      case "newest":
      default:
        return (
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime()
        );
    }
  });
}
