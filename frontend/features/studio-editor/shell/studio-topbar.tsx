"use client"

import Link from "next/link"
import {
  Beaker,
  Menu,
  MessageSquareText,
  Moon,
  Redo2,
  Sun,
  Undo2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "@/components/providers/theme-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { useStudioHistoryState } from "@/features/studio-editor/store/studio-editor-store"

type StudioTopbarProps = {
  projectName: string
  projectStatus: string
  aspectRatio: string
  sourceLabel: string
}

function StudioMenu() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Open studio menu">
          <Menu />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/studio">Back to projects</Link>
        </DropdownMenuItem>
        <DropdownMenuItem>Version history</DropdownMenuItem>
        <DropdownMenuItem>Keyboard shortcuts</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-40">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="size-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="size-4" />
              Dark
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Documentation</DropdownMenuItem>
        <DropdownMenuItem>Submit feedback</DropdownMenuItem>
        <DropdownMenuItem>Ask AI</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function StudioTopbar({
  projectName,
  projectStatus,
  aspectRatio,
  sourceLabel,
}: StudioTopbarProps) {
  const { canRedo, canUndo, redoEditorChange, undoEditorChange } =
    useStudioHistoryState()

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/88">
      <div className="flex min-w-0 items-center gap-2">
        <StudioMenu />
        <Separator orientation="vertical" className="h-5" />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Undo"
          onClick={undoEditorChange}
          disabled={!canUndo}
        >
          <Undo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Redo"
          onClick={redoEditorChange}
          disabled={!canRedo}
        >
          <Redo2 />
        </Button>
        <Separator orientation="vertical" className="hidden h-5 sm:block" />
        <div className="hidden items-center text-sm text-muted-foreground sm:flex">
          <Beaker className="mr-1 size-4 text-amber-500" />
          <span>Demo editing canvas</span>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 flex justify-center px-40">
        <div className="min-w-0 text-center">
          <p className="max-w-[32rem] truncate text-sm font-semibold text-foreground">
            {projectName}
          </p>
          <p className="max-w-[36rem] truncate text-[11px] text-muted-foreground">
            {projectStatus} · {aspectRatio} · {sourceLabel}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <Badge variant="warning" className="hidden lg:inline-flex">
          Demo
        </Badge>
        <Button variant="ghost" size="icon-sm" aria-label="Comments">
          <MessageSquareText />
        </Button>
        <Button variant="ghost" size="sm" className="hidden md:inline-flex">
          Share
        </Button>
        <Button variant="outline" size="sm">
          Publish
        </Button>
        <Button size="sm">Export</Button>
      </div>
    </header>
  )
}
