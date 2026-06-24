"use client"

import Link from "next/link"
import {
  Beaker,
  Check,
  CloudAlert,
  CloudUpload,
  Download,
  Eye,
  LoaderCircle,
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
import {
  useStudioHistoryState,
  useStudioProjectState,
} from "@/features/studio-editor/store/studio-editor-store"
import { useEditorSnapshotPersistence } from "@/features/studio-editor/editor-snapshot/editor-snapshot-persistence"
import { useEditorRouteParams } from "@/features/studio-editor/hooks/use-editor-route-params"
import { useRenderExportFlow } from "@/features/studio-editor/render-export/use-render-export-flow"

type StudioTopbarProps = {
  projectName: string
  projectStatus: string
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
  sourceLabel,
}: StudioTopbarProps) {
  const { canRedo, canUndo, redoEditorChange, undoEditorChange } =
    useStudioHistoryState()
  const { project } = useStudioProjectState()
  const { retry, saveNow, status } = useEditorSnapshotPersistence()
  const { projectId, workspaceId } = useEditorRouteParams()
  const saveIndicator = {
    "view-only": {
      icon: Eye,
      label: "View only",
      variant: "neutral" as const,
    },
    idle: {
      icon: Check,
      label: "Saved",
      variant: "success" as const,
    },
    dirty: {
      icon: CloudUpload,
      label: "Unsaved changes",
      variant: "warning" as const,
    },
    saving: {
      icon: LoaderCircle,
      label: "Saving…",
      variant: "info" as const,
    },
    saved: {
      icon: Check,
      label: "Saved",
      variant: "success" as const,
    },
    error: {
      icon: CloudAlert,
      label: "Save failed",
      variant: "danger" as const,
    },
    conflict: {
      icon: CloudAlert,
      label: "Version conflict",
      variant: "warning" as const,
    },
  }[status]
  const SaveIndicatorIcon = saveIndicator.icon
  const exportBlockedBySnapshot =
    status === "conflict" || status === "error" || status === "view-only"
  const renderExport = useRenderExportFlow({
    blockedBySnapshot: exportBlockedBySnapshot,
    projectId,
    saveNow,
    workspaceId,
  })
  const exportLabel =
    renderExport.phase === "saving"
      ? "Saving…"
      : renderExport.phase === "rendering"
        ? "Rendering…"
        : "Export"

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
            {projectStatus} · {project.media.aspectRatio} · {sourceLabel}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        {status === "error" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive"
            onClick={retry}
          >
            Retry save
          </Button>
        ) : null}
        <Badge variant={saveIndicator.variant} className="gap-1">
          <SaveIndicatorIcon
            className={status === "saving" ? "size-3 animate-spin" : "size-3"}
          />
          {saveIndicator.label}
        </Badge>
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
        <Button
          size="sm"
          onClick={() => void renderExport.startExport()}
          disabled={renderExport.disabled}
        >
          {renderExport.phase === "idle" ? (
            <Download />
          ) : (
            <LoaderCircle className="animate-spin" />
          )}
          {exportLabel}
        </Button>
      </div>
    </header>
  )
}
