"use client"

import { Suspense, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { UploadCloud } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { DataPagination } from "@/components/shared/data-pagination"
import {
  mediaLibraryItems,
  mediaLibraryTabOptions,
  mediaSortOptions,
  mediaStatusFilterOptions,
  mediaTypeFilterOptions,
} from "@/features/media-library/media-library.data"
import { MediaFilterBar } from "@/features/media-library/components/media-filter-bar"
import { MediaLibraryCard } from "@/features/media-library/components/media-library-card"
import { MediaLibraryEmptyState } from "@/features/media-library/components/media-library-empty-state"
import { MediaLibraryLoading } from "@/features/media-library/components/media-library-loading"
import { MediaLibraryPreviewDialog } from "@/features/media-library/components/media-library-preview-dialog"
import { MediaLibraryRow } from "@/features/media-library/components/media-library-row"
import { MediaLibraryTabs } from "@/features/media-library/components/media-library-tabs"
import { MediaLibraryToolbar } from "@/features/media-library/components/media-library-toolbar"
import {
  filterAndSortMediaItems,
  formatShortDate,
  getMediaItemsForTab,
} from "@/features/media-library/media-library.utils"
import { longToShortCandidatesBySourceId } from "@/features/long-to-short/long-to-short.data"
import { useMediaList } from "@/features/media-library/hooks/use-media-list"
import {
  useDeleteMedia,
  useMediaPreviewUrl,
  useRenameMedia,
} from "@/features/media-library/hooks/use-media-mutations"
import { useMediaUploadQueue } from "@/features/media-library/hooks/use-media-upload-queue"
import { mediaService } from "@/features/media-library/services/media.service"
import type {
  MediaLibraryItem,
  MediaLibrarySortKey,
  MediaLibraryTab,
  MediaLibraryViewMode,
  MediaStatusFilter,
  MediaTypeFilter,
} from "@/features/media-library/media-library.types"
import { useWorkspace } from "@/features/workspaces/components/workspace-provider"

const MEDIA_LIBRARY_PAGE_SIZE = 6

function getMediaListSort(sortKey: MediaLibrarySortKey) {
  if (sortKey === "oldest") {
    return { sortBy: "createdAt" as const, sortOrder: "asc" as const }
  }

  if (sortKey === "name") {
    return { sortBy: "title" as const, sortOrder: "asc" as const }
  }

  if (sortKey === "duration") {
    return { sortBy: "duration" as const, sortOrder: "desc" as const }
  }

  return { sortBy: "createdAt" as const, sortOrder: "desc" as const }
}

function openAssetUrl(url: string, filename?: string) {
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.target = "_blank"
  anchor.rel = "noreferrer"
  if (filename) {
    anchor.download = filename
  }
  anchor.click()
}

function parseMediaLibraryTab(value: string | null): MediaLibraryTab {
  if (value === "original") {
    return "ORIGINAL"
  }

  if (value === "editor-outputs") {
    return "EDITOR_OUTPUTS"
  }

  if (value === "long-to-short") {
    return "LONG_TO_SHORT"
  }

  return "ALL"
}

function formatMediaLibraryTabParam(tab: MediaLibraryTab) {
  if (tab === "ORIGINAL") {
    return "original"
  }

  if (tab === "EDITOR_OUTPUTS") {
    return "editor-outputs"
  }

  if (tab === "LONG_TO_SHORT") {
    return "long-to-short"
  }

  return null
}

function MediaLibraryPageContent() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedWorkspaceId } = useWorkspace()
  const workspaceId = selectedWorkspaceId ?? ""
  const [demoItems, setDemoItems] = useState<MediaLibraryItem[]>(() =>
    mediaLibraryItems.map((item) => ({ ...item, isDemo: true }))
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<MediaLibraryViewMode>("grid")
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>("ALL")
  const [statusFilter, setStatusFilter] = useState<MediaStatusFilter>("ALL")
  const [sortKey, setSortKey] = useState<MediaLibrarySortKey>("newest")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPreviewItem, setSelectedPreviewItem] =
    useState<MediaLibraryItem | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const activeTab = parseMediaLibraryTab(searchParams.get("tab"))
  const previewMediaId = searchParams.get("preview")
  const selectedLongToShortSourceId = searchParams.get("source")
  const sort = getMediaListSort(sortKey)
  const isRealMediaTab = activeTab === "ALL" || activeTab === "ORIGINAL"
  const mediaQuery = useMediaList(workspaceId, {
    page: 1,
    limit: 50,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    ...sort,
  })
  const renameMutation = useRenameMedia(workspaceId)
  const deleteMutation = useDeleteMedia(workspaceId)
  const uploadQueue = useMediaUploadQueue(selectedWorkspaceId ?? undefined)
  const realItems = [...uploadQueue.items, ...(mediaQuery.data?.items ?? [])]
  const items = getMediaItemsForTab(realItems, demoItems, activeTab)
  const isLoading = isRealMediaTab && mediaQuery.isLoading

  const handleOpenUpload = () => {
    fileInputRef.current?.click()
  }

  const resetFilters = () => {
    setSearchQuery("")
    setTypeFilter("ALL")
    setStatusFilter("ALL")
    setSortKey("newest")
    setCurrentPage(1)
    updateLibraryUrl("ALL")
  }

  const updateLibraryUrl = (
    nextTab: MediaLibraryTab,
    nextSourceId?: string | null
  ) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    const tabParam = formatMediaLibraryTabParam(nextTab)

    if (tabParam) {
      nextParams.set("tab", tabParam)
    } else {
      nextParams.delete("tab")
    }

    if (nextTab === "LONG_TO_SHORT" && nextSourceId) {
      nextParams.set("source", nextSourceId)
    } else {
      nextParams.delete("source")
    }
    nextParams.delete("preview")

    const queryString = nextParams.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    })
  }

  const handleTabChange = (nextTab: MediaLibraryTab) => {
    setCurrentPage(1)
    updateLibraryUrl(nextTab)
  }

  const openMediaPreview = (item: MediaLibraryItem) => {
    if (item.status !== "UPLOADED") {
      return
    }

    setSelectedPreviewItem(item)

    if (activeTab !== "LONG_TO_SHORT" || !item.longToShortSourceId) {
      return
    }

    updateLibraryUrl("LONG_TO_SHORT", item.longToShortSourceId)
  }

  const openLongToShortSource = (item: MediaLibraryItem) => {
    if (!item.longToShortSourceId) {
      setSelectedPreviewItem(item)
      return
    }

    setSelectedPreviewItem(item)
    updateLibraryUrl("LONG_TO_SHORT", item.longToShortSourceId)
  }

  const closeMediaPreview = () => {
    setSelectedPreviewItem(null)

    if (activeTab === "LONG_TO_SHORT" && selectedLongToShortSourceId) {
      updateLibraryUrl("LONG_TO_SHORT")
      return
    }

    if (previewMediaId) {
      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.delete("preview")

      const queryString = nextParams.toString()
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      })
    }
  }

  const renameMediaItem = (itemId: string, title: string) => {
    const item = items.find((candidate) => candidate.id === itemId)

    if (item?.isDemo) {
      setDemoItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === itemId
            ? {
                ...currentItem,
                title,
                updatedAt: new Date().toISOString(),
              }
            : currentItem
        )
      )
      toast.success("Demo media renamed", { description: title })
      return
    }

    renameMutation.mutate(
      { mediaId: itemId, title },
      {
        onSuccess: () =>
          toast.success("Media renamed", { description: title }),
        onError: (error) =>
          toast.error("Unable to rename media", {
            description:
              error instanceof Error ? error.message : "Please try again.",
          }),
      }
    )
  }

  const handleUploadSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])

    if (selectedFiles.length < 1) {
      return
    }

    const rejected = uploadQueue.addFiles(selectedFiles)
    rejected.forEach(({ file, message }) => {
      toast.error(`Cannot upload ${file.name}`, { description: message })
    })

    event.target.value = ""
  }

  const deleteMediaItem = (item: MediaLibraryItem) => {
    if (item.id.startsWith("local-upload-")) {
      uploadQueue.cancelUpload(item.id)
      uploadQueue.dismissUpload(item.id)
      toast.success("Upload canceled", { description: item.title })
      return
    }

    if (item.isDemo) {
      setDemoItems((current) =>
        current.filter((candidate) => candidate.id !== item.id)
      )
      toast.success("Demo media removed", { description: item.title })
      return
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () =>
        toast.success("Media deleted", { description: item.title }),
      onError: (error) =>
        toast.error("Unable to delete media", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        }),
    })
  }

  const downloadMediaItem = async (item: MediaLibraryItem) => {
    try {
      if (item.isDemo && item.assetUrl) {
        openAssetUrl(item.assetUrl, item.originalFilename)
        return
      }

      const { url } = await mediaService.getDownloadUrl(workspaceId, item.id)
      openAssetUrl(url, item.originalFilename)
    } catch (error) {
      toast.error("Unable to prepare download", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  const visibleItems = filterAndSortMediaItems(items, {
    searchQuery,
    activeTab,
    typeFilter,
    statusFilter,
    sortKey,
  })
  const pageCount = Math.max(
    1,
    Math.ceil(visibleItems.length / MEDIA_LIBRARY_PAGE_SIZE)
  )
  const safeCurrentPage = Math.min(currentPage, pageCount)
  const paginatedItems = visibleItems.slice(
    (safeCurrentPage - 1) * MEDIA_LIBRARY_PAGE_SIZE,
    safeCurrentPage * MEDIA_LIBRARY_PAGE_SIZE
  )

  const selectedLongToShortSource =
    activeTab === "LONG_TO_SHORT" && selectedLongToShortSourceId
      ? items.find(
          (item) =>
            item.longToShortSourceId === selectedLongToShortSourceId &&
            item.libraryGroup === "ORIGINAL"
        ) ?? null
      : null
  const queryPreviewItem = previewMediaId
    ? items.find(
        (item) => item.id === previewMediaId && item.status === "UPLOADED"
      ) ?? null
    : null
  const previewItem = selectedPreviewItem ?? queryPreviewItem ?? selectedLongToShortSource
  const navigablePreviewItems = visibleItems.filter(
    (item) => item.status === "UPLOADED"
  )
  const previewItemIndex = previewItem
    ? navigablePreviewItems.findIndex((item) => item.id === previewItem.id)
    : -1
  const hasPreviousPreviewItem = previewItemIndex > 0
  const hasNextPreviewItem =
    previewItemIndex >= 0 && previewItemIndex < navigablePreviewItems.length - 1
  const previewCandidates =
    activeTab === "LONG_TO_SHORT" && previewItem?.longToShortSourceId
      ? longToShortCandidatesBySourceId[previewItem.longToShortSourceId] ?? []
      : []
  const previewUrlQuery = useMediaPreviewUrl(
    workspaceId,
    previewItem && !previewItem.isDemo ? previewItem.id : null,
    previewItem?.status === "UPLOADED"
  )
  const resolvedPreviewItem =
    previewItem && !previewItem.isDemo && previewUrlQuery.data?.url
      ? { ...previewItem, assetUrl: previewUrlQuery.data.url }
      : previewItem

  const openPreviewFromNavigation = (item: MediaLibraryItem) => {
    setSelectedPreviewItem(item)

    if (activeTab === "LONG_TO_SHORT" && item.longToShortSourceId) {
      updateLibraryUrl("LONG_TO_SHORT", item.longToShortSourceId)
      return
    }

    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set("preview", item.id)
    nextParams.delete("source")

    const queryString = nextParams.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    })
  }

  const openPreviousPreviewItem = () => {
    if (hasPreviousPreviewItem) {
      openPreviewFromNavigation(navigablePreviewItems[previewItemIndex - 1])
    }
  }

  const openNextPreviewItem = () => {
    if (hasNextPreviewItem) {
      openPreviewFromNavigation(navigablePreviewItems[previewItemIndex + 1])
    }
  }

  const hasLibraryItems = items.length > 0
  const shouldShowEmptyState = !isLoading && !hasLibraryItems
  const shouldShowNoResults = !isLoading && hasLibraryItems && visibleItems.length < 1
  const lastUpdatedLabel =
    hasLibraryItems && !isLoading
      ? formatShortDate(
          [...items].sort(
            (left, right) =>
              new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
          )[0].updatedAt
        )
      : null

  const renderContent = () => {
    if (isLoading) {
      return <MediaLibraryLoading viewMode={viewMode} />
    }

    if (isRealMediaTab && mediaQuery.isError) {
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-semibold text-foreground">
            Media Library could not be loaded
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {mediaQuery.error instanceof Error
              ? mediaQuery.error.message
              : "Please check the API connection and try again."}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => void mediaQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      )
    }

    if (shouldShowEmptyState) {
      return (
        <MediaLibraryEmptyState mode="empty" onPrimaryAction={handleOpenUpload} />
      )
    }

    if (shouldShowNoResults) {
      return (
        <MediaLibraryEmptyState
          mode="no-results"
          onPrimaryAction={handleOpenUpload}
          onSecondaryAction={resetFilters}
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
              onOpen={
                item.status !== "UPLOADED"
                  ? undefined
                  : activeTab === "LONG_TO_SHORT"
                    ? openLongToShortSource
                    : openMediaPreview
              }
              actionLabel={activeTab === "LONG_TO_SHORT" ? "View clips" : "Preview"}
              onRename={renameMediaItem}
              onDelete={deleteMediaItem}
              onDownload={(mediaItem) => void downloadMediaItem(mediaItem)}
              onRetry={
                item.id.startsWith("local-upload-")
                  ? (mediaItem) => uploadQueue.retryUpload(mediaItem.id)
                  : undefined
              }
              onDismiss={
                item.id.startsWith("local-upload-")
                  ? (mediaItem) => uploadQueue.dismissUpload(mediaItem.id)
                  : undefined
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
            onOpen={
              item.status !== "UPLOADED"
                ? undefined
                : activeTab === "LONG_TO_SHORT"
                  ? openLongToShortSource
                  : openMediaPreview
            }
            onRename={renameMediaItem}
            onDelete={deleteMediaItem}
            onDownload={(mediaItem) => void downloadMediaItem(mediaItem)}
            onRetry={
              item.id.startsWith("local-upload-")
                ? (mediaItem) => uploadQueue.retryUpload(mediaItem.id)
                : undefined
            }
            onDismiss={
              item.id.startsWith("local-upload-")
                ? (mediaItem) => uploadQueue.dismissUpload(mediaItem.id)
                : undefined
            }
          />
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-6 lg:gap-8">
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept=".mp4,.webm,.mov,.mp3,.m4a,.wav,.ogg,.flac,.jpg,.jpeg,.png,.webp,.gif,.srt,.vtt,video/*,audio/*,image/*"
        multiple
        onChange={handleUploadSelection}
      />

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
            <Button type="button" size="lg" onClick={handleOpenUpload}>
              <UploadCloud className="size-4" />
              Upload media
            </Button>
            <p className="text-xs text-muted-foreground">
              {hasLibraryItems
                ? `${items.length} source items in the library${lastUpdatedLabel ? ` • last updated ${lastUpdatedLabel}` : ""}`
                : "Video, audio, image, and subtitle uploads stay here before downstream workflows."}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <MediaLibraryTabs
          activeTab={activeTab}
          options={mediaLibraryTabOptions}
          onTabChange={handleTabChange}
        />
        {activeTab === "EDITOR_OUTPUTS" || activeTab === "LONG_TO_SHORT" ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Demo data
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                This view remains mocked until its generated-output API is wired.
              </p>
            </div>
            <span className="rounded-full border border-amber-500/30 bg-background/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">
              Demo
            </span>
          </div>
        ) : null}
        {!shouldShowEmptyState ? (
          <>
          <MediaLibraryToolbar
            searchQuery={searchQuery}
            onSearchChange={(value) => {
              setSearchQuery(value)
              setCurrentPage(1)
            }}
            sortKey={sortKey}
            onSortChange={(value) => {
              setSortKey(value)
              setCurrentPage(1)
            }}
            sortOptions={mediaSortOptions}
            viewMode={viewMode}
            onViewModeChange={(value) => {
              setViewMode(value)
              setCurrentPage(1)
            }}
          />
          <MediaFilterBar
            typeFilter={typeFilter}
            onTypeFilterChange={(value) => {
              setTypeFilter(value)
              setCurrentPage(1)
            }}
            statusFilter={statusFilter}
            onStatusFilterChange={(value) => {
              setStatusFilter(value)
              setCurrentPage(1)
            }}
            typeOptions={mediaTypeFilterOptions}
            statusOptions={mediaStatusFilterOptions}
          />
          </>
        ) : null}
      </section>

      <section className="space-y-4">
        {renderContent()}
        {!isLoading && !shouldShowEmptyState && !shouldShowNoResults ? (
          <DataPagination
            page={safeCurrentPage}
            pageSize={MEDIA_LIBRARY_PAGE_SIZE}
            totalItems={visibleItems.length}
            onPageChange={setCurrentPage}
          />
        ) : null}
      </section>
      <MediaLibraryPreviewDialog
        item={resolvedPreviewItem}
        activeTab={activeTab}
        candidates={previewCandidates}
        hasNextItem={hasNextPreviewItem}
        hasPreviousItem={hasPreviousPreviewItem}
        open={Boolean(previewItem)}
        onDownload={
          previewItem
            ? () => void downloadMediaItem(resolvedPreviewItem ?? previewItem)
            : undefined
        }
        onNextItem={openNextPreviewItem}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeMediaPreview()
          }
        }}
        onPreviousItem={openPreviousPreviewItem}
        previewError={
          previewItem && !previewItem.isDemo && previewUrlQuery.isError
            ? previewUrlQuery.error instanceof Error
              ? previewUrlQuery.error.message
              : "Unable to create a preview URL."
            : null
        }
        previewLoading={
          Boolean(previewItem && !previewItem.isDemo) &&
          previewUrlQuery.isLoading
        }
      />
    </div>
  )
}

export function MediaLibraryPage() {
  return (
    <Suspense fallback={<MediaLibraryLoading viewMode="grid" />}>
      <MediaLibraryPageContent />
    </Suspense>
  )
}
