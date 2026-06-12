"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"

import { StudioInspector } from "@/features/studio-editor/components/studio-inspector"
import { StudioPanel } from "@/features/studio-editor/components/studio-panel"
import { StudioSidebar } from "@/features/studio-editor/components/studio-sidebar"
import { StudioEditorProvider } from "@/features/studio-editor/studio-editor-context"
import {
  StudioTimeline,
  TIMELINE_DEFAULT_HEIGHT,
  TIMELINE_MAX_HEIGHT,
  TIMELINE_MIN_HEIGHT,
} from "@/features/studio-editor/components/studio-timeline"
import { StudioTopbar } from "@/features/studio-editor/components/studio-topbar"
import { getStudioProjectDisplayName } from "@/features/studio-hub/studio-projects.data"
import { cn } from "@/lib/utils"

const STUDIO_RAIL_WIDTH = 78
const LEFT_PANEL_MIN_WIDTH = 300
const LEFT_PANEL_MAX_WIDTH = 740
const LEFT_PANEL_DEFAULT_WIDTH = 340
const RIGHT_PANEL_MIN_WIDTH = 300
const RIGHT_PANEL_MAX_WIDTH = 740
const RIGHT_PANEL_DEFAULT_WIDTH = 340
const MEDIA_MIN_WIDTH = 360

type ResizeTarget = "left-panel" | "right-panel" | "timeline"

type ResizeState = {
  pointerId: number
  startHeight: number
  startWidth: number
  startX: number
  startY: number
  target: ResizeTarget
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function ResizeDivider({
  className,
  isDragging,
  label,
  onResizeStart,
}: {
  className?: string
  isDragging: boolean
  label: string
  onResizeStart: (event: React.PointerEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={onResizeStart}
      className={cn(
        "group relative z-10 h-full w-3 cursor-col-resize touch-none",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border",
        "before:absolute before:left-1/2 before:top-1/2 before:h-10 before:w-1 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-muted-foreground/35 before:opacity-80 before:transition",
        "hover:before:h-14 hover:before:bg-muted-foreground/65",
        isDragging ? "before:h-14 before:bg-primary/70" : null,
        className
      )}
    />
  )
}

function TimelineResizeDivider({
  isDragging,
  onResizeStart,
}: {
  isDragging: boolean
  onResizeStart: (event: React.PointerEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      data-studio-timeline-divider=""
      aria-label="Resize timeline"
      onPointerDown={onResizeStart}
      className={cn(
        "group flex h-3 cursor-row-resize touch-none items-center justify-center border-y border-border bg-background transition-colors",
        isDragging ? "bg-muted" : "hover:bg-muted/70"
      )}
    >
      <span className="h-1 w-12 rounded-full bg-muted-foreground/35 transition-colors group-hover:bg-muted-foreground/60" />
    </button>
  )
}

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams<{ projectId: string }>()
  const mainRef = useRef<HTMLDivElement>(null)
  const [leftPanelWidth, setLeftPanelWidth] = useState(LEFT_PANEL_DEFAULT_WIDTH)
  const [rightPanelWidth, setRightPanelWidth] = useState(RIGHT_PANEL_DEFAULT_WIDTH)
  const [timelineHeight, setTimelineHeight] = useState(TIMELINE_DEFAULT_HEIGHT)
  const [activeResizeTarget, setActiveResizeTarget] = useState<ResizeTarget | null>(
    null
  )
  const resizeStateRef = useRef<ResizeState | null>(null)
  const projectName = getStudioProjectDisplayName(params.projectId ?? "untitled-project")

  useEffect(() => {
    if (!activeResizeTarget) {
      document.body.style.removeProperty("cursor")
      document.body.style.removeProperty("user-select")
      return
    }

    document.body.style.cursor =
      activeResizeTarget === "timeline" ? "row-resize" : "col-resize"
    document.body.style.userSelect = "none"

    return () => {
      document.body.style.removeProperty("cursor")
      document.body.style.removeProperty("user-select")
    }
  }, [activeResizeTarget])

  useEffect(() => {
    if (!activeResizeTarget) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current

      if (!resizeState || event.pointerId !== resizeState.pointerId) {
        return
      }

      if (resizeState.target === "timeline") {
        const nextHeight = resizeState.startHeight + (resizeState.startY - event.clientY)
        setTimelineHeight(clamp(nextHeight, TIMELINE_MIN_HEIGHT, TIMELINE_MAX_HEIGHT))
        return
      }

      const mainWidth = mainRef.current?.getBoundingClientRect().width ?? 0
      const availablePanelWidth = Math.max(
        0,
        mainWidth - STUDIO_RAIL_WIDTH - MEDIA_MIN_WIDTH
      )

      if (resizeState.target === "left-panel") {
        const panelMaxWidth = Math.min(
          LEFT_PANEL_MAX_WIDTH,
          Math.max(LEFT_PANEL_MIN_WIDTH, availablePanelWidth - rightPanelWidth)
        )
        const nextWidth = resizeState.startWidth + (event.clientX - resizeState.startX)
        setLeftPanelWidth(clamp(nextWidth, LEFT_PANEL_MIN_WIDTH, panelMaxWidth))
        return
      }

      const panelMaxWidth = Math.min(
        RIGHT_PANEL_MAX_WIDTH,
        Math.max(RIGHT_PANEL_MIN_WIDTH, availablePanelWidth - leftPanelWidth)
      )
      const nextWidth = resizeState.startWidth + (resizeState.startX - event.clientX)
      setRightPanelWidth(clamp(nextWidth, RIGHT_PANEL_MIN_WIDTH, panelMaxWidth))
    }

    const handlePointerUp = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current

      if (!resizeState || event.pointerId !== resizeState.pointerId) {
        return
      }

      resizeStateRef.current = null
      setActiveResizeTarget(null)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
    }
  }, [activeResizeTarget, leftPanelWidth, rightPanelWidth])

  const startResize = (
    target: ResizeTarget,
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    resizeStateRef.current = {
      pointerId: event.pointerId,
      startHeight: timelineHeight,
      startWidth: target === "right-panel" ? rightPanelWidth : leftPanelWidth,
      startX: event.clientX,
      startY: event.clientY,
      target,
    }
    setActiveResizeTarget(target)
  }

  return (
    <StudioEditorProvider>
      <div
        className="grid h-screen overflow-hidden bg-background text-foreground"
        style={{
          gridTemplateRows: `auto minmax(0, 1fr) 12px ${timelineHeight}px`,
        }}
      >
        <StudioTopbar projectName={projectName} />

        <div
          ref={mainRef}
          className="grid h-full min-h-0 overflow-hidden"
          style={{
            gridTemplateColumns: `${STUDIO_RAIL_WIDTH}px ${leftPanelWidth}px minmax(0, 1fr) ${rightPanelWidth}px`,
          }}
        >
          <StudioSidebar />
          <div className="min-h-0 min-w-0">
            <StudioPanel />
          </div>
          <div className="relative min-h-0 min-w-0 overflow-hidden">
            <ResizeDivider
              label="Resize left panel"
              isDragging={activeResizeTarget === "left-panel"}
              onResizeStart={(event) => startResize("left-panel", event)}
              className="absolute inset-y-0 left-0 -translate-x-1/2"
            />
            <main className="h-full min-h-0 min-w-0 overflow-hidden">{children}</main>
            <ResizeDivider
              label="Resize right panel"
              isDragging={activeResizeTarget === "right-panel"}
              onResizeStart={(event) => startResize("right-panel", event)}
              className="absolute inset-y-0 right-0 translate-x-1/2"
            />
          </div>
          <div className="min-h-0 min-w-0">
            <StudioInspector />
          </div>
        </div>

        <TimelineResizeDivider
          isDragging={activeResizeTarget === "timeline"}
          onResizeStart={(event) => startResize("timeline", event)}
        />

        <StudioTimeline />
      </div>
    </StudioEditorProvider>
  )
}
