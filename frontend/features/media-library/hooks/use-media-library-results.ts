"use client";

import type {
  MediaLibraryItem,
  MediaLibrarySortKey,
  MediaLibraryTab,
  MediaTypeFilter,
} from "../types/media-library.types";
import {
  filterAndSortMediaItems,
  formatShortDate,
} from "../utils/media-library.utils";

export const MEDIA_LIBRARY_PAGE_SIZE = 6;

type UseMediaLibraryResultsParams = {
  activeTab: MediaLibraryTab;
  currentPage: number;
  isLoading: boolean;
  items: MediaLibraryItem[];
  searchQuery: string;
  sortKey: MediaLibrarySortKey;
  typeFilter: MediaTypeFilter;
};

export function useMediaLibraryResults({
  activeTab,
  currentPage,
  isLoading,
  items,
  searchQuery,
  sortKey,
  typeFilter,
}: UseMediaLibraryResultsParams) {
  const visibleItems = filterAndSortMediaItems(items, {
    searchQuery,
    activeTab,
    typeFilter,
    sortKey,
  });
  const pageCount = Math.max(
    1,
    Math.ceil(visibleItems.length / MEDIA_LIBRARY_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const paginatedItems = visibleItems.slice(
    (safeCurrentPage - 1) * MEDIA_LIBRARY_PAGE_SIZE,
    safeCurrentPage * MEDIA_LIBRARY_PAGE_SIZE,
  );
  const hasLibraryItems = items.length > 0;
  const shouldShowEmptyState = !isLoading && !hasLibraryItems;
  const shouldShowNoResults =
    !isLoading && hasLibraryItems && visibleItems.length < 1;
  const lastUpdatedLabel =
    hasLibraryItems && !isLoading
      ? formatShortDate(
          [...items].sort(
            (left, right) =>
              new Date(right.updatedAt).getTime() -
              new Date(left.updatedAt).getTime(),
          )[0].updatedAt,
        )
      : null;

  return {
    currentPage: safeCurrentPage,
    hasLibraryItems,
    lastUpdatedLabel,
    pageSize: MEDIA_LIBRARY_PAGE_SIZE,
    paginatedItems,
    shouldShowEmptyState,
    shouldShowNoResults,
    showPagination: !isLoading && !shouldShowEmptyState && !shouldShowNoResults,
    totalVisibleItems: visibleItems.length,
    visibleItems,
  };
}
