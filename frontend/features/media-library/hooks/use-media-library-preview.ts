"use client";

import { useState } from "react";

import type { LongToShortCandidate } from "@/features/long-to-short/long-to-short.types";

import type { MediaLibraryItem, MediaLibraryTab } from "../types/media-library.types";
import { useMediaDetail } from "./use-media-detail";
import { useMediaPreviewUrl } from "./use-media-mutations";

type UseMediaLibraryPreviewParams = {
  activeTab: MediaLibraryTab;
  clearPreviewUrl: () => void;
  items: MediaLibraryItem[];
  previewMediaId: string | null;
  selectedLongToShortSourceId: string | null;
  updateLibraryUrl: (
    nextTab: MediaLibraryTab,
    nextSourceId?: string | null,
  ) => void;
  updatePreviewUrl: (mediaId: string) => void;
  visibleItems: MediaLibraryItem[];
  workspaceId: string;
};

export function useMediaLibraryPreview({
  activeTab,
  clearPreviewUrl,
  items,
  previewMediaId,
  selectedLongToShortSourceId,
  updateLibraryUrl,
  updatePreviewUrl,
  visibleItems,
  workspaceId,
}: UseMediaLibraryPreviewParams) {
  const [selectedPreviewItem, setSelectedPreviewItem] =
    useState<MediaLibraryItem | null>(null);

  const selectedLongToShortSource =
    activeTab === "LONG_TO_SHORT" && selectedLongToShortSourceId
      ? (items.find(
          (item) =>
            item.longToShortSourceId === selectedLongToShortSourceId &&
            item.libraryGroup === "ORIGINAL",
        ) ?? null)
      : null;
  const queryPreviewItem = previewMediaId
    ? (items.find(
        (item) => item.id === previewMediaId && item.status === "UPLOADED",
      ) ?? null)
    : null;
  const previewItem =
    selectedPreviewItem ?? queryPreviewItem ?? selectedLongToShortSource;
  const navigablePreviewItems = visibleItems.filter(
    (item) => item.status === "UPLOADED",
  );
  const previewItemIndex = previewItem
    ? navigablePreviewItems.findIndex((item) => item.id === previewItem.id)
    : -1;
  const hasPreviousPreviewItem = previewItemIndex > 0;
  const hasNextPreviewItem =
    previewItemIndex >= 0 &&
    previewItemIndex < navigablePreviewItems.length - 1;
  const previewCandidates: LongToShortCandidate[] = [];
  const previewUrlQuery = useMediaPreviewUrl(
    workspaceId,
    previewItem ? previewItem.id : null,
    previewItem?.status === "UPLOADED",
  );
  const previewDetailQuery = useMediaDetail(
    workspaceId,
    previewItem ? previewItem.id : null,
    {
      enabled: previewItem?.status === "UPLOADED",
      pollUntilReady: true,
    },
  );
  const resolvedPreviewItem =
    previewItem && previewUrlQuery.data?.url
      ? { ...previewItem, assetUrl: previewUrlQuery.data.url }
      : previewItem;

  const openMediaPreview = (item: MediaLibraryItem) => {
    if (item.status !== "UPLOADED") {
      return;
    }

    setSelectedPreviewItem(item);

    if (activeTab !== "LONG_TO_SHORT" || !item.longToShortSourceId) {
      return;
    }

    updateLibraryUrl("LONG_TO_SHORT", item.longToShortSourceId);
  };

  const openLongToShortSource = (item: MediaLibraryItem) => {
    if (!item.longToShortSourceId) {
      setSelectedPreviewItem(item);
      return;
    }

    setSelectedPreviewItem(item);
    updateLibraryUrl("LONG_TO_SHORT", item.longToShortSourceId);
  };

  const closeMediaPreview = () => {
    setSelectedPreviewItem(null);

    if (activeTab === "LONG_TO_SHORT" && selectedLongToShortSourceId) {
      updateLibraryUrl("LONG_TO_SHORT");
      return;
    }

    if (previewMediaId) {
      clearPreviewUrl();
    }
  };

  const openPreviewFromNavigation = (item: MediaLibraryItem) => {
    setSelectedPreviewItem(item);

    if (activeTab === "LONG_TO_SHORT" && item.longToShortSourceId) {
      updateLibraryUrl("LONG_TO_SHORT", item.longToShortSourceId);
      return;
    }

    updatePreviewUrl(item.id);
  };

  const openPreviousPreviewItem = () => {
    if (hasPreviousPreviewItem) {
      openPreviewFromNavigation(navigablePreviewItems[previewItemIndex - 1]);
    }
  };

  const openNextPreviewItem = () => {
    if (hasNextPreviewItem) {
      openPreviewFromNavigation(navigablePreviewItems[previewItemIndex + 1]);
    }
  };

  return {
    preview: {
      activeTab,
      candidates: previewCandidates,
      detail: previewDetailQuery.data?.media ?? null,
      error:
        previewItem && previewUrlQuery.isError
          ? previewUrlQuery.error instanceof Error
            ? previewUrlQuery.error.message
            : "Unable to create a preview URL."
          : null,
      hasNextItem: hasNextPreviewItem,
      hasPreviousItem: hasPreviousPreviewItem,
      item: resolvedPreviewItem,
      loading: Boolean(previewItem) && previewUrlQuery.isLoading,
      open: Boolean(previewItem),
    },
    onNextPreviewItem: openNextPreviewItem,
    onOpenLongToShortSource: openLongToShortSource,
    onOpenMediaPreview: openMediaPreview,
    onPreviousPreviewItem: openPreviousPreviewItem,
    onPreviewOpenChange: (nextOpen: boolean) => {
      if (!nextOpen) {
        closeMediaPreview();
      }
    },
  };
}
