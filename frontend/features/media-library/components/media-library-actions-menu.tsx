"use client"

import { Download, MoreHorizontal, PencilLine, Trash2 } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function MediaLibraryActionsMenu() {
  const preventMenuAction = (event: Event) => {
    event.preventDefault()
  }

  return (
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
        <DropdownMenuItem onSelect={preventMenuAction}>
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
  )
}

