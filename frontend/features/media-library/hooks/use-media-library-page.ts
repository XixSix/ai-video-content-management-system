"use client";

import { useWorkspace } from "@/features/workspaces/components/workspace-provider";

import type { MediaLibraryPageShellProps } from "../components/media-library-page-shell";
import type { MediaLibraryTab } from "../types/media-library.types";
import { useMediaLibraryActions } from "./use-media-library-actions";
import { useMediaLibraryFilterState } from "./use-media-library-filter-state";
import { useMediaLibraryItems } from "./use-media-library-items";
import { useMediaLibraryPreview } from "./use-media-library-preview";
import { useMediaLibraryResults } from "./use-media-library-results";
import { useMediaLibraryUrlState } from "./use-media-library-url-state";

export function useMediaLibraryPage(): MediaLibraryPageShellProps {
  const { selectedWorkspaceId } = useWorkspace();
  const workspaceId = selectedWorkspaceId ?? "";
  const urlState = useMediaLibraryUrlState();
  const filters = useMediaLibraryFilterState();
  const library = useMediaLibraryItems({
    activeTab: urlState.activeTab,
    selectedWorkspaceId: selectedWorkspaceId ?? undefined,
    sortKey: filters.sortKey,
    statusFilter: filters.statusFilter,
    workspaceId,
  });
  const results = useMediaLibraryResults({
    activeTab: urlState.activeTab,
    currentPage: filters.currentPage,
    isLoading: library.isLoading,
    items: library.items,
    searchQuery: filters.searchQuery,
    sortKey: filters.sortKey,
    statusFilter: filters.statusFilter,
    typeFilter: filters.typeFilter,
  });
  const actions = useMediaLibraryActions({
    uploadQueue: library.uploadQueue,
    workspaceId,
  });
  const preview = useMediaLibraryPreview({
    activeTab: urlState.activeTab,
    clearPreviewUrl: urlState.clearPreviewUrl,
    items: library.items,
    previewMediaId: urlState.previewMediaId,
    selectedLongToShortSourceId: urlState.selectedLongToShortSourceId,
    updateLibraryUrl: urlState.updateLibraryUrl,
    updatePreviewUrl: urlState.updatePreviewUrl,
    visibleItems: results.visibleItems,
    workspaceId,
  });

  const handleResetFilters = () => {
    filters.resetFilters();
    urlState.updateLibraryUrl("ALL");
  };

  const handleTabChange = (nextTab: MediaLibraryTab) => {
    filters.setCurrentPage(1);
    urlState.updateLibraryUrl(nextTab);
  };

  return {
    activeTab: urlState.activeTab,
    currentPage: results.currentPage,
    errorMessage: library.errorMessage,
    fileInputRef: actions.fileInputRef,
    hasLibraryItems: results.hasLibraryItems,
    isLoading: library.isLoading,
    itemsCount: library.items.length,
    lastUpdatedLabel: results.lastUpdatedLabel,
    pageSize: results.pageSize,
    paginatedItems: results.paginatedItems,
    preview: preview.preview,
    searchQuery: filters.searchQuery,
    shouldShowEmptyState: results.shouldShowEmptyState,
    shouldShowNoResults: results.shouldShowNoResults,
    showGeneratedOutputNotice:
      urlState.activeTab === "EDITOR_OUTPUTS" ||
      urlState.activeTab === "LONG_TO_SHORT",
    showPagination: results.showPagination,
    sortKey: filters.sortKey,
    statusFilter: filters.statusFilter,
    totalVisibleItems: results.totalVisibleItems,
    typeFilter: filters.typeFilter,
    viewMode: filters.viewMode,
    onDeleteItem: actions.onDeleteItem,
    onDismissUpload: actions.onDismissUpload,
    onDownloadItem: actions.onDownloadItem,
    onNextPreviewItem: preview.onNextPreviewItem,
    onOpenLongToShortSource: preview.onOpenLongToShortSource,
    onOpenMediaPreview: preview.onOpenMediaPreview,
    onOpenUpload: actions.onOpenUpload,
    onPageChange: filters.setCurrentPage,
    onPreviousPreviewItem: preview.onPreviousPreviewItem,
    onPreviewOpenChange: preview.onPreviewOpenChange,
    onRenameItem: actions.onRenameItem,
    onResetFilters: handleResetFilters,
    onRetryLoad: library.onRetryLoad,
    onRetryUpload: actions.onRetryUpload,
    onSearchChange: filters.onSearchChange,
    onSortChange: filters.onSortChange,
    onStatusFilterChange: filters.onStatusFilterChange,
    onTabChange: handleTabChange,
    onTypeFilterChange: filters.onTypeFilterChange,
    onUploadSelection: actions.onUploadSelection,
    onViewModeChange: filters.onViewModeChange,
  };
}
