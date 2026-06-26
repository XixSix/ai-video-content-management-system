"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertTriangle, LoaderCircle } from "lucide-react"
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
  usePanelRef,
} from "react-resizable-panels"
import type { PanelSize } from "react-resizable-panels"

import { StudioInspector } from "@/features/studio-editor/inspector/studio-inspector"
import { StudioSidebar } from "@/features/studio-editor/shell/studio-sidebar"
import { StudioEditorStoreProvider } from "@/features/studio-editor/store/studio-editor-store"
import { StudioToolPanel } from "@/features/studio-editor/tool-panel/studio-tool-panel"
import {
  TIMELINE_COLLAPSED_HEIGHT,
  StudioTimeline,
  TIMELINE_DEFAULT_HEIGHT,
  TIMELINE_MAX_HEIGHT,
} from "@/features/studio-editor/timeline/studio-timeline"
import { StudioTopbar } from "@/features/studio-editor/shell/studio-topbar"
import { useProjectDetail } from "@/features/studio-hub/hooks/use-projects"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api/api-error"
import { cn } from "@/lib/utils"
import { useEditorSnapshot } from "@/features/studio-editor/editor-snapshot/editor-snapshot.queries"
import {
  createDefaultEditorDocument,
  createStudioProjectFromDetail,
  hydrateEditorDocument,
} from "@/features/studio-editor/editor-snapshot/editor-snapshot.mapper"
import { EditorSnapshotPersistenceProvider } from "@/features/studio-editor/editor-snapshot/editor-snapshot-persistence"

const STUDIO_RAIL_WIDTH = 78
const LEFT_PANEL_MIN_WIDTH = 300
const LEFT_PANEL_MAX_WIDTH = 740
const LEFT_PANEL_DEFAULT_WIDTH = 340
const RIGHT_PANEL_MIN_WIDTH = 300
const RIGHT_PANEL_MAX_WIDTH = 740
const RIGHT_PANEL_DEFAULT_WIDTH = 340
const MEDIA_MIN_WIDTH = 360
const SIDE_PANEL_COLLAPSED_HANDLE_WIDTH = 4
const TIMELINE_COLLAPSE_HEIGHT = 64

function SideResizeHandle({
  isCollapsed,
  label,
  side,
}: {
  isCollapsed?: boolean
  label: string
  side: "left" | "right"
}) {
  return (
    <PanelResizeHandle
      aria-label={label}
      className={cn(
        "group relative z-10 h-full cursor-col-resize touch-none outline-none",
        isCollapsed ? "w-6" : "w-3",
        isCollapsed
          ? "hover:[&_.studio-resize-track]:border-muted-foreground/35 hover:[&_.studio-resize-grip]:bg-muted-foreground"
          : "hover:[&_.studio-resize-grip]:h-14 hover:[&_.studio-resize-grip]:bg-muted-foreground/65",
        side === "left" ? "-ml-1" : "-mr-1"
      )}
    >
      {isCollapsed ? (
        <>
          <span className="studio-resize-track absolute left-1/2 top-1/2 h-16 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-muted-foreground/20 bg-surface-muted shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition" />
          <span className="studio-resize-grip absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/65 transition" />
        </>
      ) : (
        <>
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
          <span className="studio-resize-grip absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/35 opacity-80 transition" />
        </>
      )}
    </PanelResizeHandle>
  )
}

function TimelineResizeDivider({
  isCollapsed,
}: {
  isCollapsed: boolean
}) {
  return (
    <PanelResizeHandle
      data-studio-timeline-divider=""
      aria-label="Resize timeline"
      className={cn(
        "group flex cursor-row-resize touch-none items-center justify-center border-y border-border bg-background outline-none transition-colors",
        isCollapsed ? "h-4" : "h-4",
        "hover:bg-muted/70 active:bg-muted/80"
      )}
    >
      <span
        className={cn(
          "rounded-full transition-all",
          isCollapsed
            ? "h-2 w-16 border border-muted-foreground/20 bg-surface-muted shadow-[0_4px_14px_rgba(0,0,0,0.2)]"
            : "h-1.5 w-14 bg-muted-foreground/50 shadow-[0_0_0_1px_color-mix(in_srgb,var(--background)_70%,transparent),0_4px_12px_rgba(0,0,0,0.22)]",
          "group-hover:h-2 group-hover:w-16 group-hover:bg-muted-foreground/70",
        )}
      />
    </PanelResizeHandle>
  )
}

export default function StudioLayout({
  children,
}: {
  children: ReactNode
}) {
  const params = useParams<{ workspaceId: string; projectId: string }>()
  const workspaceId = params.workspaceId ?? ""
  const projectId = params.projectId ?? ""
  const projectQuery = useProjectDetail(workspaceId, projectId)
  const snapshotQuery = useEditorSnapshot(workspaceId, projectId)
  const authSession = useAuthSession()
  const timelinePanelRef = usePanelRef()
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false)
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false)
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false)
  const project = projectQuery.data?.project

  if (
    projectQuery.isLoading ||
    snapshotQuery.isLoading ||
    authSession.isLoading
  ) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Loading Studio project...
        </div>
      </div>
    )
  }

  if (
    projectQuery.isError ||
    snapshotQuery.isError ||
    authSession.isError ||
    !project ||
    !snapshotQuery.data ||
    !authSession.data
  ) {
    const isNotFound =
      (projectQuery.error instanceof ApiError &&
        projectQuery.error.status === 404) ||
      (snapshotQuery.error instanceof ApiError &&
        snapshotQuery.error.status === 404)
    const loadError =
      projectQuery.error ??
      snapshotQuery.error ??
      authSession.error

    return (
      <div className="flex h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="w-full max-w-md rounded-xl border border-border/70 bg-card p-6 text-center shadow-[var(--shadow-panel)]">
          <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </span>
          <h1 className="mt-4 text-lg font-semibold">
            {isNotFound ? "Project not found" : "Studio could not be loaded"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isNotFound
              ? "This project may have been deleted or is not available in your workspace."
              : loadError instanceof Error
                ? loadError.message
                : "Please check the API connection and try again."}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            {!isNotFound ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void projectQuery.refetch()
                  void snapshotQuery.refetch()
                }}
              >
                Try again
              </Button>
            ) : null}
            <Button asChild>
              <Link href="/studio">Back to Studio</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const sourceLabel =
    project.sourceMedia?.title ??
    project.sourceMedia?.originalFilename ??
    "No source media"
  const defaultDocument = createDefaultEditorDocument(project)
  const initialSnapshot = snapshotQuery.data.editorSnapshot
  const initialDocument = initialSnapshot?.document ?? defaultDocument
  const initialProject = hydrateEditorDocument(
    createStudioProjectFromDetail(project),
    initialDocument
  )
  const canEdit = project.userId === authSession.data.id

  const reloadLatestSnapshot = async () => {
    const result = await snapshotQuery.refetch()

    if (result.error) {
      throw result.error
    }

    const latestSnapshot = result.data?.editorSnapshot

    return {
      document: latestSnapshot?.document ?? createDefaultEditorDocument(project),
      version: latestSnapshot?.version ?? 0,
    }
  }

  const syncLeftPanelCollapsed = (panelSize: PanelSize) => {
    setIsLeftPanelCollapsed(panelSize.inPixels <= SIDE_PANEL_COLLAPSED_HANDLE_WIDTH)
  }

  const syncRightPanelCollapsed = (panelSize: PanelSize) => {
    setIsRightPanelCollapsed(panelSize.inPixels <= SIDE_PANEL_COLLAPSED_HANDLE_WIDTH)
  }

  const syncTimelineCollapsed = (panelSize: PanelSize) => {
    setIsTimelineCollapsed(panelSize.inPixels <= TIMELINE_COLLAPSE_HEIGHT)
  }

  const handleTimelineToggle = () => {
    if (isTimelineCollapsed) {
      timelinePanelRef.current?.resize(`${TIMELINE_DEFAULT_HEIGHT}px`)
      setIsTimelineCollapsed(false)
      return
    }

    timelinePanelRef.current?.resize(`${TIMELINE_COLLAPSED_HEIGHT}px`)
    setIsTimelineCollapsed(true)
  }

  return (
    <StudioEditorStoreProvider
      key={`${workspaceId}:${projectId}`}
      initialProject={initialProject}
      initialMutedTrackIds={initialDocument.settings.mutedTrackIds}
      canEdit={canEdit}
    >
      <EditorSnapshotPersistenceProvider
        canEdit={canEdit}
        initialVersion={initialSnapshot?.version ?? 0}
        workspaceId={workspaceId}
        projectId={projectId}
        reloadLatest={reloadLatestSnapshot}
      >
        <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
          <StudioTopbar
            projectName={project.title}
            projectStatus={project.status}
            sourceLabel={sourceLabel}
          />

        <PanelGroup
          id="studio-editor-vertical-layout"
          orientation="vertical"
          resizeTargetMinimumSize={{ fine: 16, coarse: 32 }}
          className="min-h-0 flex-1"
        >
          <Panel id="studio-main-panel" minSize="320px">
            <div
              className="grid h-full min-h-0 overflow-hidden"
              style={{
                gridTemplateColumns: `${STUDIO_RAIL_WIDTH}px minmax(0, 1fr)`,
              }}
            >
              <StudioSidebar />

              <PanelGroup
                id="studio-editor-horizontal-layout"
                orientation="horizontal"
                resizeTargetMinimumSize={{ fine: 14, coarse: 32 }}
                className="min-h-0 min-w-0"
              >
                <Panel
                  id="studio-left-panel"
                  defaultSize={`${LEFT_PANEL_DEFAULT_WIDTH}px`}
                  minSize="0px"
                  maxSize={`${LEFT_PANEL_MAX_WIDTH}px`}
                  groupResizeBehavior="preserve-pixel-size"
                  onResize={syncLeftPanelCollapsed}
                  className="min-h-0 min-w-0 overflow-hidden"
                >
                  <div
                    className={cn(
                      "h-full transition-opacity duration-100 ease-out",
                      isLeftPanelCollapsed
                        ? "pointer-events-none opacity-0"
                        : "opacity-100"
                    )}
                    style={{ minWidth: LEFT_PANEL_MIN_WIDTH }}
                  >
                    <StudioToolPanel />
                  </div>
                </Panel>

                <SideResizeHandle
                  label="Resize left panel"
                  side="left"
                  isCollapsed={isLeftPanelCollapsed}
                />

                <Panel
                  id="studio-canvas-panel"
                  minSize={`${MEDIA_MIN_WIDTH}px`}
                  className="min-h-0 min-w-0"
                >
                  <main className="h-full min-h-0 min-w-0 overflow-hidden">
                    {children}
                  </main>
                </Panel>

                <SideResizeHandle
                  label="Resize right panel"
                  side="right"
                  isCollapsed={isRightPanelCollapsed}
                />

                <Panel
                  id="studio-right-panel"
                  defaultSize={`${RIGHT_PANEL_DEFAULT_WIDTH}px`}
                  minSize="0px"
                  maxSize={`${RIGHT_PANEL_MAX_WIDTH}px`}
                  groupResizeBehavior="preserve-pixel-size"
                  onResize={syncRightPanelCollapsed}
                  className="min-h-0 min-w-0 overflow-hidden"
                >
                  <div
                    className={cn(
                      "h-full transition-opacity duration-100 ease-out",
                      isRightPanelCollapsed
                        ? "pointer-events-none opacity-0"
                        : "opacity-100"
                    )}
                    style={{ minWidth: RIGHT_PANEL_MIN_WIDTH }}
                  >
                    <StudioInspector />
                  </div>
                </Panel>
              </PanelGroup>
            </div>
          </Panel>

          <TimelineResizeDivider isCollapsed={isTimelineCollapsed} />

          <Panel
            id="studio-timeline-panel"
            panelRef={timelinePanelRef}
            defaultSize={`${TIMELINE_DEFAULT_HEIGHT}px`}
            minSize={`${TIMELINE_COLLAPSED_HEIGHT}px`}
            maxSize={`${TIMELINE_MAX_HEIGHT}px`}
            groupResizeBehavior="preserve-pixel-size"
            onResize={syncTimelineCollapsed}
            className="min-h-0 min-w-0"
          >
            <StudioTimeline
              isCollapsed={isTimelineCollapsed}
              onToggleCollapse={handleTimelineToggle}
            />
          </Panel>
          </PanelGroup>
        </div>
      </EditorSnapshotPersistenceProvider>
    </StudioEditorStoreProvider>
  )
}
