"use client";

import type {
  MediaLibrarySortKey,
  MediaLibraryTab,
  MediaStatusFilter,
} from "../types/media-library.types";
import { getMediaItemsForTab } from "../utils/media-library.utils";
import { useMediaList } from "./use-media-list";
import { useMediaUploadQueue } from "./use-media-upload-queue";

function getMediaListSort(sortKey: MediaLibrarySortKey) {
  if (sortKey === "oldest") {
    return { sortBy: "createdAt" as const, sortOrder: "asc" as const };
  }

  if (sortKey === "name") {
    return { sortBy: "title" as const, sortOrder: "asc" as const };
  }

  if (sortKey === "duration") {
    return { sortBy: "duration" as const, sortOrder: "desc" as const };
  }

  return { sortBy: "createdAt" as const, sortOrder: "desc" as const };
}

type UseMediaLibraryItemsParams = {
  activeTab: MediaLibraryTab;
  selectedWorkspaceId: string | undefined;
  sortKey: MediaLibrarySortKey;
  statusFilter: MediaStatusFilter;
  workspaceId: string;
};

export function useMediaLibraryItems({
  activeTab,
  selectedWorkspaceId,
  sortKey,
  statusFilter,
  workspaceId,
}: UseMediaLibraryItemsParams) {
  const sort = getMediaListSort(sortKey);
  const isRealMediaTab = activeTab === "ALL" || activeTab === "ORIGINAL";
  const mediaQuery = useMediaList(workspaceId, {
    page: 1,
    limit: 50,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    ...sort,
  });
  const uploadQueue = useMediaUploadQueue(selectedWorkspaceId);
  const realItems = [...uploadQueue.items, ...(mediaQuery.data?.items ?? [])];
  const items = getMediaItemsForTab(realItems, activeTab);

  return {
    errorMessage:
      isRealMediaTab && mediaQuery.isError
        ? mediaQuery.error instanceof Error
          ? mediaQuery.error.message
          : "Please check the API connection and try again."
        : null,
    isLoading: isRealMediaTab && mediaQuery.isLoading,
    items,
    uploadQueue,
    onRetryLoad: () => void mediaQuery.refetch(),
  };
}

export type MediaLibraryUploadQueue = ReturnType<
  typeof useMediaLibraryItems
>["uploadQueue"];
