"use client";

import type {
  MediaLibrarySortKey,
  MediaLibraryTab,
} from "../types/media-library.types";
import { getMediaItemsForTab } from "../utils/media-library.utils";
import { useGeneratedAssets } from "@/features/assets/use-assets";
import { mapGeneratedAssetToLibraryItem } from "../utils/media-library.mapper";
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
  workspaceId: string;
};

export function useMediaLibraryItems({
  activeTab,
  selectedWorkspaceId,
  sortKey,
  workspaceId,
}: UseMediaLibraryItemsParams) {
  const sort = getMediaListSort(sortKey);
  const isRealMediaTab = activeTab === "ALL" || activeTab === "ORIGINAL";
  const shouldLoadGeneratedAssets =
    activeTab === "ALL" || activeTab === "EDITOR_OUTPUTS";
  const mediaQuery = useMediaList(workspaceId, {
    page: 1,
    limit: 50,
    ...sort,
  });
  const assetsQuery = useGeneratedAssets(
    {
      page: 1,
      limit: 50,
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    shouldLoadGeneratedAssets,
  );
  const uploadQueue = useMediaUploadQueue(selectedWorkspaceId);
  const realItems = [
    ...uploadQueue.items,
    ...(mediaQuery.data?.items ?? []),
    ...(assetsQuery.data?.items.map(mapGeneratedAssetToLibraryItem) ?? []),
  ];
  const items = getMediaItemsForTab(realItems, activeTab);

  return {
    errorMessage:
      isRealMediaTab && mediaQuery.isError
        ? mediaQuery.error instanceof Error
          ? mediaQuery.error.message
          : "Please check the API connection and try again."
        : activeTab === "EDITOR_OUTPUTS" && assetsQuery.isError
          ? assetsQuery.error instanceof Error
            ? assetsQuery.error.message
            : "Please check the generated assets API and try again."
        : null,
    isLoading:
      (isRealMediaTab && mediaQuery.isLoading) ||
      (activeTab === "EDITOR_OUTPUTS" && assetsQuery.isLoading),
    items,
    uploadQueue,
    onRetryLoad: () => {
      void mediaQuery.refetch();
      void assetsQuery.refetch();
    },
  };
}

export type MediaLibraryUploadQueue = ReturnType<
  typeof useMediaLibraryItems
>["uploadQueue"];
