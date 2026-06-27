"use client"

import Image from "next/image"
import {
  useState,
  type FormEvent,
} from "react"
import {
  AlertTriangle,
  Download,
  FileText,
  HardDrive,
  Info,
  MoreHorizontal,
  PencilLine,
  RefreshCw,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { MediaLibraryItem } from "../types/media-library.types"
import {
  formatFileSize,
  formatFullDateTime,
} from "../utils/media-library.utils"

type MediaLibraryActionsMenuProps = {
  item: MediaLibraryItem
  onRename?: (title: string) => void
  onDelete?: () => void
  onDownload?: () => void
  onRetry?: () => void
  onDismiss?: () => void
}

export function MediaLibraryActionsMenu({
  item,
  onRename,
  onDelete,
  onDownload,
  onRetry,
  onDismiss,
}: MediaLibraryActionsMenuProps) {
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [titleDraft, setTitleDraft] = useState(item.title)
  const itemLabel = item.libraryGroup === "EDITOR_OUTPUT" ? "output" : "media"

  const openRenameDialog = (event: Event) => {
    event.preventDefault()
    setTitleDraft(item.title)
    setIsRenameOpen(true)
  }

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextTitle = titleDraft.trim()

    if (nextTitle) {
      onRename?.(nextTitle)
      setIsRenameOpen(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            aria-label="Open media actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 min-w-44">
          {item.status === "FAILED" && onRetry ? (
            <DropdownMenuItem onSelect={onRetry}>
              <RefreshCw className="size-4" />
              Retry upload
            </DropdownMenuItem>
          ) : null}
          {item.status !== "UPLOADING" && item.status !== "FAILED" && onRename ? (
            <DropdownMenuItem onSelect={openRenameDialog}>
              <PencilLine className="size-4" />
              Rename
            </DropdownMenuItem>
          ) : null}
          {item.status === "UPLOADED" && onDownload ? (
            <DropdownMenuItem onSelect={onDownload}>
              <Download className="size-4" />
              Download
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => setIsPropertiesOpen(true)}>
            <Info className="size-4" />
            Properties
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {item.status === "FAILED" && onDismiss ? (
            <DropdownMenuItem onSelect={onDismiss} variant="destructive">
              <XCircle className="size-4" />
              Dismiss
            </DropdownMenuItem>
          ) : onDelete ? (
            <DropdownMenuItem
              onSelect={() => setIsDeleteOpen(true)}
              variant="destructive"
            >
              <Trash2 className="size-4" />
              {item.status === "UPLOADING" && !item.uploadInterrupted
                ? "Cancel upload"
                : "Delete"}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <form onSubmit={submitRename} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Rename media</DialogTitle>
              <DialogDescription>
                Update the display name used across the media library.
              </DialogDescription>
            </DialogHeader>

            <Input
              autoFocus
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              placeholder="Media title"
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={!titleDraft.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>
              {item.status === "UPLOADING" && !item.uploadInterrupted
                ? "Cancel this upload?"
                : `Delete this ${itemLabel}?`}
            </DialogTitle>
            <DialogDescription>
              {item.status === "UPLOADING" && !item.uploadInterrupted
                ? "The current transfer will stop and its temporary storage object will be cleaned up."
                : item.libraryGroup === "EDITOR_OUTPUT"
                  ? "This removes the generated asset from storage and cannot be undone."
                  : "This removes the source file from Media Library and cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Keep media
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onDelete?.()
                setIsDeleteOpen(false)
              }}
            >
              {item.status === "UPLOADING" && !item.uploadInterrupted
                ? "Cancel upload"
                : `Delete ${itemLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
        <SheetContent className="w-[min(92vw,26rem)] p-0 sm:max-w-[26rem]">
          <SheetHeader className="border-b border-border/70 px-5 py-4">
            <SheetTitle>Properties</SheetTitle>
            <SheetDescription className="line-clamp-1">
              {item.title}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            <div className="space-y-5 py-5">
              <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/35">
                <div className="flex aspect-video items-center justify-center bg-background/60">
                  {item.thumbnailUrl ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={item.thumbnailUrl}
                        alt=""
                        fill
                        sizes="26rem"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <FileText className="size-10 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1 border-t border-border/70 p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-foreground">
                    {item.title}
                  </p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {item.originalFilename}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Details
                </p>
                <dl className="divide-y divide-border/70 rounded-xl border border-border/70 bg-background/70">
                  <PropertyRow label="Filename" value={item.originalFilename} />
                  <PropertyRow
                    label="File size"
                    value={formatFileSize(item.fileSizeBytes)}
                  />
                  <PropertyRow label="File type" value={item.mimeType} />
                  <PropertyRow
                    label="Created"
                    value={formatFullDateTime(item.createdAt)}
                  />
                  <PropertyRow
                    label="Updated"
                    value={formatFullDateTime(item.updatedAt)}
                  />
                  <PropertyRow label="Owner" value={item.ownerName ?? "You"} />
                </dl>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-muted/35 px-3 py-2">
                  <HardDrive className="size-4" />
                  {item.libraryGroup === "ORIGINAL" ? "Original" : "Output"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-muted/35 px-3 py-2">
                  <UserRound className="size-4" />
                  {item.status}
                </span>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function PropertyRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 px-3 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-foreground">{value}</dd>
    </div>
  )
}
