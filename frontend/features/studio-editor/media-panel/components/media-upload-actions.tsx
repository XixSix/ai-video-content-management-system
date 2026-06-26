"use client"

import { useRef, useState, type DragEvent } from "react"
import {
  AlertCircle,
  CloudUpload,
  Library,
  LoaderCircle,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { MediaLibraryItem } from "@/features/media-library/types/media-library.types"
import { cn } from "@/lib/utils"

import { getMediaImportMetadata } from "../lib/media-display"

export function MediaUploadActions({
  importableItems,
  attachingMediaId,
  canEdit,
  importError,
  importLoading,
  onImportMedia,
  onRetryImport,
  onUploadFiles,
}: {
  importableItems: MediaLibraryItem[]
  attachingMediaId: string | null
  canEdit: boolean
  importError: Error | null
  importLoading: boolean
  onImportMedia: (item: MediaLibraryItem) => void
  onRetryImport: () => void
  onUploadFiles: (files: File[]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!canEdit || !files?.length) {
      return
    }

    onUploadFiles(Array.from(files))
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragActive(false)
    handleFiles(event.dataTransfer.files)
  }

  return (
    <>
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragActive(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragActive(true)
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          "w-full rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center transition",
          isDragActive ? "border-sky-500/70 bg-sky-500/5" : "hover:border-foreground/25",
          !canEdit && "cursor-not-allowed opacity-55"
        )}
      >
        <CloudUpload className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          {canEdit
            ? "Drag files here or click to upload"
            : "Only the project creator can add media"}
        </p>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        disabled={!canEdit}
        multiple
        accept="audio/*,image/*,video/*"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.currentTarget.files)
          event.currentTarget.value = ""
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="mt-4 w-full"
        disabled={!canEdit}
        onClick={() => setIsImportOpen(true)}
      >
        <Library className="size-4" />
        Import from Media Library
      </Button>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-h-[min(36rem,calc(100vh-2rem))] overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-5 pb-4 pr-12 pt-5">
            <DialogTitle>Import media</DialogTitle>
            <DialogDescription>
              Add existing library media to this edit.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-auto px-5 pb-5">
            {importLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading Media Library…
              </div>
            ) : importError ? (
              <div className="my-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
                <AlertCircle className="mx-auto size-5 text-destructive" />
                <p className="mt-2 text-sm text-foreground">
                  Media Library could not be loaded.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={onRetryImport}
                >
                  <RefreshCw />
                  Retry
                </Button>
              </div>
            ) : (
              <div className="grid gap-2 py-4">
                {importableItems.map((item) => (
                <div
                  key={item.id}
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-background p-2"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Upload className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.originalFilename}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {getMediaImportMetadata(item)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Import ${item.originalFilename}`}
                    disabled={attachingMediaId === item.id}
                    onClick={() => {
                      onImportMedia(item)
                    }}
                  >
                    {attachingMediaId === item.id ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                  </Button>
                </div>
                ))}
              </div>
            )}

            {!importLoading && !importError && importableItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                All library media is already in this edit.
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
