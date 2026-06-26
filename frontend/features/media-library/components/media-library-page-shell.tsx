"use client"

import type { ChangeEvent, RefObject } from "react"
import { UploadCloud } from "lucide-react"

import { DataPagination } from "@/components/shared/data-pagination"
import { Button } from "@/components/ui/button"
import type { LongToShortCandidate } from "@/features/long-to-short/long-to-short.types"

import {
  mediaLibraryTabOptions,
  mediaSortOptions,
  mediaStatusFilterOptions,
  mediaTypeFilterOptions,
} from "../constants/media-library.data"
import type {
  MediaDetailResponseData,
  MediaLibraryItem,
  MediaLibrarySortKey,
  MediaLibraryTab,
  MediaLibraryViewMode,
  MediaStatusFilter,
  MediaTypeFilter,
} from "../types/media-library.types"
import { MediaFilterBar } from "./media-filter-bar"
import { MediaLibraryCard } from "./media-library-card"
import { MediaLibraryEmptyState } from "./media-library-empty-state"
import { MediaLibraryLoading } from "./media-library-loading"
import { MediaLibraryPreviewDialog } from "./media-library-preview-dialog"
import { MediaLibraryRow } from "./media-library-row"
import { MediaLibraryTabs } from "./media-library-tabs"
import { MediaLibraryToolbar } from "./media-library-toolbar"

export type MediaLibraryPageShellProps = {
  activeTab: MediaLibraryTab
  currentPage: number
  errorMessage: string | null
  fileInputRef: RefObject<HTMLInputElement | null>
  hasLibraryItems: boolean
  isLoading: boolean
  itemsCount: number
  lastUpdatedLabel: string | null
  pageSize: number
  paginatedItems: MediaLibraryItem[]
  preview: {
    activeTab: MediaLibraryTab
    candidates: LongToShortCandidate[]
    error: string | null
    hasNextItem: boolean
    hasPreviousItem: boolean
    item: MediaLibraryItem | null
    loading: boolean
    detail: MediaDetailResponseData | null
    open: boolean
  }
  searchQuery: string
  shouldShowEmptyState: boolean
  shouldShowNoResults: boolean
  showGeneratedOutputNotice: boolean
  showPagination: boolean
  sortKey: MediaLibrarySortKey
  statusFilter: MediaStatusFilter
  totalVisibleItems: number
  typeFilter: MediaTypeFilter
  viewMode: MediaLibraryViewMode
  onDeleteItem: (item: MediaLibraryItem) => void
  onDismissUpload: (item: MediaLibraryItem) => void
  onDownloadItem: (item: MediaLibraryItem) => void
  onNextPreviewItem: () => void
  onOpenMediaPreview: (item: MediaLibraryItem) => void
  onOpenLongToShortSource: (item: MediaLibraryItem) => void
  onOpenUpload: () => void
  onPageChange: (page: number) => void
  onPreviousPreviewItem: () => void
  onPreviewOpenChange: (open: boolean) => void
  onRenameItem: (itemId: string, title: string) => void
  onResetFilters: () => void
  onRetryLoad: () => void
  onRetryUpload: (item: MediaLibraryItem) => void
  onSearchChange: (value: string) => void
  onSortChange: (value: MediaLibrarySortKey) => void
  onStatusFilterChange: (value: MediaStatusFilter) => void
  onTabChange: (tab: MediaLibraryTab) => void
  onTypeFilterChange: (value: MediaTypeFilter) => void
  onUploadSelection: (event: ChangeEvent<HTMLInputElement>) => void
  onViewModeChange: (value: MediaLibraryViewMode) => void
}

function MediaLibraryHeader({
  hasLibraryItems,
  itemsCount,
  lastUpdatedLabel,
  onOpenUpload,
}: Pick<
  MediaLibraryPageShellProps,
  "hasLibraryItems" | "itemsCount" | "lastUpdatedLabel" | "onOpenUpload"
>) {
  return (
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
            Source workspace
          </span>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-[2rem]">
              Media Library
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
              Browse source uploads, see which downstream outputs are ready,
              and jump back into the workspace without treating media like a
              reporting dashboard.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <Button type="button" size="lg" onClick={onOpenUpload}>
            <UploadCloud className="size-4" />
            Upload media
          </Button>
          <p className="text-xs text-muted-foreground">
            {hasLibraryItems
              ? `${itemsCount} source items in the library${lastUpdatedLabel ? ` • last updated ${lastUpdatedLabel}` : ""}`
              : "Video, audio, image, and subtitle uploads stay here before downstream workflows."}
          </p>
        </div>
      </div>
    </section>
  )
}

function MediaLibraryControls({
  activeTab,
  searchQuery,
  shouldShowEmptyState,
  showGeneratedOutputNotice,
  sortKey,
  statusFilter,
  typeFilter,
  viewMode,
  onSearchChange,
  onSortChange,
  onStatusFilterChange,
  onTabChange,
  onTypeFilterChange,
  onViewModeChange,
}: Pick<
  MediaLibraryPageShellProps,
  | "activeTab"
  | "searchQuery"
  | "shouldShowEmptyState"
  | "showGeneratedOutputNotice"
  | "sortKey"
  | "statusFilter"
  | "typeFilter"
  | "viewMode"
  | "onSearchChange"
  | "onSortChange"
  | "onStatusFilterChange"
  | "onTabChange"
  | "onTypeFilterChange"
  | "onViewModeChange"
>) {
  return (
    <section className="space-y-4">
      <MediaLibraryTabs
        activeTab={activeTab}
        options={mediaLibraryTabOptions}
        onTabChange={onTabChange}
      />
      {showGeneratedOutputNotice ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Generated outputs are not connected yet
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              This view will populate after the generated-output API is wired.
            </p>
          </div>
          <span className="rounded-full border border-amber-500/30 bg-background/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">
            Empty
          </span>
        </div>
      ) : null}
      {!shouldShowEmptyState ? (
        <>
          <MediaLibraryToolbar
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            sortKey={sortKey}
            onSortChange={onSortChange}
            sortOptions={mediaSortOptions}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
          />
          <MediaFilterBar
            typeFilter={typeFilter}
            onTypeFilterChange={onTypeFilterChange}
            statusFilter={statusFilter}
            onStatusFilterChange={onStatusFilterChange}
            typeOptions={mediaTypeFilterOptions}
            statusOptions={mediaStatusFilterOptions}
          />
        </>
      ) : null}
    </section>
  )
}

function MediaLibraryContent({
  activeTab,
  errorMessage,
  isLoading,
  paginatedItems,
  shouldShowEmptyState,
  shouldShowNoResults,
  viewMode,
  onDeleteItem,
  onDismissUpload,
  onDownloadItem,
  onOpenMediaPreview,
  onOpenLongToShortSource,
  onOpenUpload,
  onRenameItem,
  onResetFilters,
  onRetryLoad,
  onRetryUpload,
}: Pick<
  MediaLibraryPageShellProps,
  | "activeTab"
  | "errorMessage"
  | "isLoading"
  | "paginatedItems"
  | "shouldShowEmptyState"
  | "shouldShowNoResults"
  | "viewMode"
  | "onDeleteItem"
  | "onDismissUpload"
  | "onDownloadItem"
  | "onOpenMediaPreview"
  | "onOpenLongToShortSource"
  | "onOpenUpload"
  | "onRenameItem"
  | "onResetFilters"
  | "onRetryLoad"
  | "onRetryUpload"
>) {
  const getOpenHandler = (item: MediaLibraryItem) => {
    if (item.status !== "UPLOADED") {
      return undefined
    }

    return activeTab === "LONG_TO_SHORT"
      ? onOpenLongToShortSource
      : onOpenMediaPreview
  }

  if (isLoading) {
    return <MediaLibraryLoading viewMode={viewMode} />
  }

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-semibold text-foreground">
          Media Library could not be loaded
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={onRetryLoad}
        >
          Try again
        </Button>
      </div>
    )
  }

  if (shouldShowEmptyState) {
    return (
      <MediaLibraryEmptyState mode="empty" onPrimaryAction={onOpenUpload} />
    )
  }

  if (shouldShowNoResults) {
    return (
      <MediaLibraryEmptyState
        mode="no-results"
        onPrimaryAction={onOpenUpload}
        onSecondaryAction={onResetFilters}
      />
    )
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-3">
        {paginatedItems.map((item, index) => (
          <MediaLibraryRow
            key={item.id}
            eagerThumbnail={index < 3}
            item={item}
            onOpen={getOpenHandler(item)}
            actionLabel={
              activeTab === "LONG_TO_SHORT" ? "View clips" : "Preview"
            }
            onRename={onRenameItem}
            onDelete={onDeleteItem}
            onDownload={onDownloadItem}
            onRetry={
              item.id.startsWith("local-upload-") ? onRetryUpload : undefined
            }
            onDismiss={
              item.id.startsWith("local-upload-") ? onDismissUpload : undefined
            }
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {paginatedItems.map((item, index) => (
        <MediaLibraryCard
          key={item.id}
          eagerThumbnail={index < 4}
          item={item}
          onOpen={getOpenHandler(item)}
          onRename={onRenameItem}
          onDelete={onDeleteItem}
          onDownload={onDownloadItem}
          onRetry={
            item.id.startsWith("local-upload-") ? onRetryUpload : undefined
          }
          onDismiss={
            item.id.startsWith("local-upload-") ? onDismissUpload : undefined
          }
        />
      ))}
    </div>
  )
}

export function MediaLibraryPageShell({
  activeTab,
  currentPage,
  errorMessage,
  fileInputRef,
  hasLibraryItems,
  isLoading,
  itemsCount,
  lastUpdatedLabel,
  pageSize,
  paginatedItems,
  preview,
  searchQuery,
  shouldShowEmptyState,
  shouldShowNoResults,
  showGeneratedOutputNotice,
  showPagination,
  sortKey,
  statusFilter,
  totalVisibleItems,
  typeFilter,
  viewMode,
  onDeleteItem,
  onDismissUpload,
  onDownloadItem,
  onNextPreviewItem,
  onOpenMediaPreview,
  onOpenLongToShortSource,
  onOpenUpload,
  onPageChange,
  onPreviousPreviewItem,
  onPreviewOpenChange,
  onRenameItem,
  onResetFilters,
  onRetryLoad,
  onRetryUpload,
  onSearchChange,
  onSortChange,
  onStatusFilterChange,
  onTabChange,
  onTypeFilterChange,
  onUploadSelection,
  onViewModeChange,
}: MediaLibraryPageShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-6 lg:gap-8">
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept=".mp4,.webm,.mov,.mp3,.m4a,.wav,.ogg,.flac,.jpg,.jpeg,.png,.webp,.gif,.srt,.vtt,video/*,audio/*,image/*"
        multiple
        onChange={onUploadSelection}
      />

      <MediaLibraryHeader
        hasLibraryItems={hasLibraryItems}
        itemsCount={itemsCount}
        lastUpdatedLabel={lastUpdatedLabel}
        onOpenUpload={onOpenUpload}
      />

      <MediaLibraryControls
        activeTab={activeTab}
        searchQuery={searchQuery}
        shouldShowEmptyState={shouldShowEmptyState}
        showGeneratedOutputNotice={showGeneratedOutputNotice}
        sortKey={sortKey}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        viewMode={viewMode}
        onSearchChange={onSearchChange}
        onSortChange={onSortChange}
        onStatusFilterChange={onStatusFilterChange}
        onTabChange={onTabChange}
        onTypeFilterChange={onTypeFilterChange}
        onViewModeChange={onViewModeChange}
      />

      <section className="space-y-4">
        <MediaLibraryContent
          activeTab={activeTab}
          errorMessage={errorMessage}
          isLoading={isLoading}
          paginatedItems={paginatedItems}
          shouldShowEmptyState={shouldShowEmptyState}
          shouldShowNoResults={shouldShowNoResults}
          viewMode={viewMode}
          onDeleteItem={onDeleteItem}
          onDismissUpload={onDismissUpload}
          onDownloadItem={onDownloadItem}
          onOpenMediaPreview={onOpenMediaPreview}
          onOpenLongToShortSource={onOpenLongToShortSource}
          onOpenUpload={onOpenUpload}
          onRenameItem={onRenameItem}
          onResetFilters={onResetFilters}
          onRetryLoad={onRetryLoad}
          onRetryUpload={onRetryUpload}
        />
        {showPagination ? (
          <DataPagination
            page={currentPage}
            pageSize={pageSize}
            totalItems={totalVisibleItems}
            onPageChange={onPageChange}
          />
        ) : null}
      </section>

      <MediaLibraryPreviewDialog
        item={preview.item}
        activeTab={preview.activeTab}
        candidates={preview.candidates}
        hasNextItem={preview.hasNextItem}
        hasPreviousItem={preview.hasPreviousItem}
        open={preview.open}
        onDownload={
          preview.item ? () => onDownloadItem(preview.item!) : undefined
        }
        onNextItem={onNextPreviewItem}
        onOpenChange={onPreviewOpenChange}
        onPreviousItem={onPreviousPreviewItem}
        previewDetail={preview.detail}
        previewError={preview.error}
        previewLoading={preview.loading}
      />
    </div>
  )
}
