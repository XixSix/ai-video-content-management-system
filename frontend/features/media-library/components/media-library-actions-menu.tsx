"use client"

import {
  useState,
  type FormEvent,
} from "react"
import { Download, MoreHorizontal, PencilLine, Trash2 } from "lucide-react"

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

type MediaLibraryActionsMenuProps = {
  itemTitle?: string
  onRename?: (title: string) => void
}

export function MediaLibraryActionsMenu({
  itemTitle = "",
  onRename,
}: MediaLibraryActionsMenuProps) {
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [titleDraft, setTitleDraft] = useState(itemTitle)

  const preventMenuAction = (event: Event) => {
    event.preventDefault()
  }

  const openRenameDialog = (event: Event) => {
    event.preventDefault()
    setTitleDraft(itemTitle)
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
          <DropdownMenuItem onSelect={openRenameDialog}>
            <PencilLine className="size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={preventMenuAction}>
            <Download className="size-4" />
            Download
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={preventMenuAction} variant="destructive">
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
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
    </>
  )
}
