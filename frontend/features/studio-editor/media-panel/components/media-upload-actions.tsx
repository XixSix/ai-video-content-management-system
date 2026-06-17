"use client"

import { useRef, useState, type DragEvent } from "react"
import { CloudUpload, Library, Plus, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { MediaLibraryItem } from "@/features/media-library/media-library.types"
import { formatDuration } from "@/features/media-library/media-library.utils"
import { cn } from "@/lib/utils"

export function MediaUploadActions({
  importableItems,
  onImportMedia,
  onUploadFiles,
}: {
  importableItems: MediaLibraryItem[]
  onImportMedia: (item: MediaLibraryItem) => void
  onUploadFiles: (files: File[]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) {
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
          isDragActive ? "border-sky-500/70 bg-sky-500/5" : "hover:border-foreground/25"
        )}
      >
        <CloudUpload className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          Drag files here or click to upload
        </p>
      </button>
      <input
        ref={fileInputRef}
        type="file"
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
                      {item.type.toLowerCase()} - {formatDuration(item.duration)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Import ${item.originalFilename}`}
                    onClick={() => {
                      onImportMedia(item)
                      setIsImportOpen(false)
                    }}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            {importableItems.length === 0 ? (
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
