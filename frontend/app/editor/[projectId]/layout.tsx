"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"

import { StudioInspector } from "@/features/studio-editor/components/studio-inspector"
import { StudioSidebar } from "@/features/studio-editor/components/studio-sidebar"
import { StudioTimeline } from "@/features/studio-editor/components/studio-timeline"
import { getStudioProjectDisplayName } from "@/features/studio-hub/studio-projects.data"
import {
  TIMELINE_DEFAULT_HEIGHT,
  TIMELINE_MAX_HEIGHT,
  TIMELINE_MIN_HEIGHT,
} from "@/features/studio-editor/components/studio-timeline"
import { StudioTopbar } from "@/features/studio-editor/components/studio-topbar"

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams<{ projectId: string }>()
  const [timelineHeight, setTimelineHeight] = useState(TIMELINE_DEFAULT_HEIGHT)
  const [isTimelineDragging, setIsTimelineDragging] = useState(false)
  const resizeStateRef = useRef<{
    pointerId: number
    startHeight: number
    startY: number
  } | null>(null)
  const projectName = getStudioProjectDisplayName(params.projectId ?? "untitled-project")

  useEffect(() => {
    if (!isTimelineDragging) {
      document.body.style.removeProperty("cursor")
      document.body.style.removeProperty("user-select")
      return
    }

    document.body.style.cursor = "row-resize"
    document.body.style.userSelect = "none"

    return () => {
      document.body.style.removeProperty("cursor")
      document.body.style.removeProperty("user-select")
    }
  }, [isTimelineDragging])

  useEffect(() => {
    if (!isTimelineDragging) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current

      if (!resizeState || event.pointerId !== resizeState.pointerId) {
        return
      }

      const nextHeight = resizeState.startHeight + (resizeState.startY - event.clientY)
      setTimelineHeight(
        Math.min(TIMELINE_MAX_HEIGHT, Math.max(TIMELINE_MIN_HEIGHT, nextHeight))
      )
    }

    const handlePointerUp = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current

      if (!resizeState || event.pointerId !== resizeState.pointerId) {
        return
      }

      resizeStateRef.current = null
      setIsTimelineDragging(false)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
    }
  }, [isTimelineDragging])

  const handleTimelineResizeStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    resizeStateRef.current = {
      pointerId: event.pointerId,
      startHeight: timelineHeight,
      startY: event.clientY,
    }
    setIsTimelineDragging(true)
  }

  return (
    <div
      className="grid h-screen overflow-hidden bg-background text-foreground"
      style={{
        gridTemplateRows: `auto minmax(0, 1fr) ${timelineHeight}px`,
      }}
    >
      <StudioTopbar projectName={projectName} />

      <div className="grid h-full min-h-0 overflow-hidden grid-cols-[326px_minmax(0,1fr)_292px]">
        <StudioSidebar />
        <main className="h-full min-h-0 overflow-hidden">{children}</main>
        <StudioInspector />
      </div>

      <StudioTimeline
        isDragging={isTimelineDragging}
        onResizeStart={handleTimelineResizeStart}
      />
    </div>
  )
}
