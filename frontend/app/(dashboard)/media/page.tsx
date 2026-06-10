"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, UploadCloud, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  mediaLibraryItems,
  mediaSortOptions,
  mediaStatusFilterOptions,
  mediaTypeFilterOptions,
} from "@/features/media-library/media-library.data"
import { MediaFilterBar } from "@/features/media-library/components/media-filter-bar"
import { MediaLibraryCard } from "@/features/media-library/components/media-library-card"
import { MediaLibraryEmptyState } from "@/features/media-library/components/media-library-empty-state"
import { MediaLibraryLoading } from "@/features/media-library/components/media-library-loading"
import { MediaLibraryRow } from "@/features/media-library/components/media-library-row"
import { MediaLibraryToolbar } from "@/features/media-library/components/media-library-toolbar"
import {
  filterAndSortMediaItems,
  formatShortDate,
} from "@/features/media-library/media-library.utils"
import type {
  MediaLibraryItem,
  MediaLibrarySortKey,
  MediaLibraryViewMode,
  MediaStatusFilter,
  MediaTypeFilter,
} from "@/features/media-library/media-library.types"

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaLibraryItem[]>(mediaLibraryItems)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<MediaLibraryViewMode>("grid")
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>("ALL")
  const [statusFilter, setStatusFilter] = useState<MediaStatusFilter>("ALL")
  const [sortKey, setSortKey] = useState<MediaLibrarySortKey>("newest")
  const [uploadNotice, setUploadNotice] = useState<{
    id: string
    message: string
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const timeoutIdsRef = useRef<number[]>([])

  useEffect(() => {
    const timeoutIds = timeoutIdsRef.current
    const timeoutId = window.setTimeout(() => {
      setIsLoading(false)
    }, 320)

    timeoutIds.push(timeoutId)

    return () => {
      timeoutIds.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  const handleOpenUpload = () => {
    fileInputRef.current?.click()
  }

  const resetFilters = () => {
    setSearchQuery("")
    setTypeFilter("ALL")
    setStatusFilter("ALL")
    setSortKey("newest")
  }

  const handleUploadSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])

    if (selectedFiles.length < 1) {
      return
    }

    const nextItems: MediaLibraryItem[] = selectedFiles.map((file, index) => {
      const type = file.type.startsWith("audio/") ? "AUDIO" : "VIDEO"
      const uploadId = `mock-upload-${Date.now()}-${index}`

      return {
        id: uploadId,
        title: file.name.replace(/\.[^/.]+$/, ""),
        originalFilename: file.name,
        thumbnailUrl: null,
        duration: null,
        fileSizeBytes: file.size,
        mimeType: file.type || (type === "AUDIO" ? "audio/mpeg" : "video/mp4"),
        type,
        status: "UPLOADING" as const,
        width: type === "VIDEO" ? 1920 : null,
        height: type === "VIDEO" ? 1080 : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        hasTranscript: false,
        hasChapters: false,
        hasClips: false,
        hasSubtitles: false,
        activeJobCount: 0,
        uploadProgress: 12,
      }
    })

    setItems((currentItems) => [...nextItems, ...currentItems])

    nextItems.forEach((item) => {
      const progressTimeoutId = window.setTimeout(() => {
        setItems((currentItems) =>
          currentItems.map((currentItem) =>
            currentItem.id === item.id
              ? {
                  ...currentItem,
                  uploadProgress: 72,
                  updatedAt: new Date().toISOString(),
                }
              : currentItem
          )
        )
      }, 850)

      const finishTimeoutId = window.setTimeout(() => {
        setItems((currentItems) =>
          currentItems.map((currentItem) =>
            currentItem.id === item.id
              ? {
                  ...currentItem,
                  status: "UPLOADED",
                  uploadProgress: undefined,
                  updatedAt: new Date().toISOString(),
                }
              : currentItem
          )
        )
        setUploadNotice({
          id: item.id,
          message: `${item.title} uploaded successfully`,
        })
      }, 1800)

      timeoutIdsRef.current.push(progressTimeoutId, finishTimeoutId)
    })

    event.target.value = ""
  }

  useEffect(() => {
    if (!uploadNotice) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setUploadNotice((currentNotice) =>
        currentNotice?.id === uploadNotice.id ? null : currentNotice
      )
    }, 3200)

    timeoutIdsRef.current.push(timeoutId)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [uploadNotice])

  const visibleItems = filterAndSortMediaItems(items, {
    searchQuery,
    typeFilter,
    statusFilter,
    sortKey,
  })

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
          {visibleItems.map((item) => (
            <MediaLibraryRow key={item.id} item={item} />
          ))}
        </div>
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleItems.map((item) => (
          <MediaLibraryCard key={item.id} item={item} />
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-6 lg:gap-8">
      {uploadNotice ? (
        <div className="fixed right-4 top-18 z-50 w-[min(92vw,360px)] rounded-xl border border-emerald-500/20 bg-background/95 p-3 shadow-[var(--shadow-panel)] backdrop-blur">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Upload complete</p>
              <p className="text-sm text-muted-foreground">{uploadNotice.message}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              onClick={() => setUploadNotice(null)}
              aria-label="Dismiss upload notice"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept="video/*,audio/*"
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
                : "Video and audio uploads stay here before transcript, chapter, and clip workflows."}
            </p>
          </div>
        </div>
      </section>

      {!shouldShowEmptyState ? (
        <section className="space-y-4">
          <MediaLibraryToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortKey={sortKey}
            onSortChange={setSortKey}
            sortOptions={mediaSortOptions}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
          <MediaFilterBar
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            typeOptions={mediaTypeFilterOptions}
            statusOptions={mediaStatusFilterOptions}
          />
        </section>
      ) : null}

      <section>{renderContent()}</section>
    </div>
  )
}
