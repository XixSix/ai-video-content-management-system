"use client"

import { useState } from "react"
import type {
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
} from "react"

import type {
  StudioEditorProject,
  StudioProjectMediaItem,
  StudioTimelineSegment,
  StudioTimelineTrack,
  StudioTimelineTrackId,
  StudioToolId,
} from "../../studio.types"
import { getSelectionToolId } from "../lib/display"
import {
  getTimelineSegmentDuration,
  getTimelineSegmentStartTime,
} from "../lib/layout"

const SEGMENT_DRAG_THRESHOLD_PX = 4

export type SegmentDragPreview = {
  durationSeconds: number
  segmentId: string
  startTime: number
  trackId: StudioTimelineTrackId
}

export function useSegmentDrag({
  didResizeSegmentRef,
  getTimelineTime,
  moveTimelineSegmentWithPush,
  project,
  setActiveTool,
  setSelectedItemId,
}: {
  didResizeSegmentRef: MutableRefObject<boolean>
  getTimelineTime: (clientX: number) => number | null
  moveTimelineSegmentWithPush: (
    segmentId: string,
    startTime: number,
    options?: {
      baseProject?: StudioEditorProject
      recordHistory?: boolean
    }
  ) => void
  project: StudioEditorProject
  setActiveTool: (toolId: StudioToolId) => void
  setSelectedItemId: (selectionId: string) => void
}) {
  const [segmentDragPreview, setSegmentDragPreview] =
    useState<SegmentDragPreview | null>(null)

  const handleSegmentDragPointerDown = ({
    event,
    media,
    segment,
    track,
  }: {
    event: ReactPointerEvent<HTMLElement>
    media: StudioProjectMediaItem | null
    segment: StudioTimelineSegment
    track: StudioTimelineTrack
  }) => {
    if (event.button !== 0 || track.id === "SOURCE") {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const initialPointerTime = getTimelineTime(event.clientX)

    if (initialPointerTime === null) {
      return
    }

    didResizeSegmentRef.current = false
    setActiveTool(getSelectionToolId(track.id, segment.selectionId))
    setSelectedItemId(segment.id)

    const dragStartProject = project
    const initialClientX = event.clientX
    const initialStartTime = getTimelineSegmentStartTime({ media, segment })
    const durationSeconds = getTimelineSegmentDuration({
      media,
      projectDurationSeconds: project.media.durationSeconds,
      segment,
    })
    let hasDragged = false
    let latestStartTime = initialStartTime

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - initialClientX

      if (!hasDragged && Math.abs(deltaX) < SEGMENT_DRAG_THRESHOLD_PX) {
        return
      }

      const pointerTime = getTimelineTime(moveEvent.clientX)

      if (pointerTime === null) {
        return
      }

      moveEvent.preventDefault()

      if (!hasDragged) {
        hasDragged = true
        didResizeSegmentRef.current = true
      }

      const nextStartTime = Math.max(
        0,
        initialStartTime + (pointerTime - initialPointerTime)
      )
      latestStartTime = nextStartTime

      setSegmentDragPreview({
        durationSeconds,
        segmentId: segment.id,
        startTime: nextStartTime,
        trackId: track.id,
      })
    }

    const cleanup = () => {
      setSegmentDragPreview(null)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerCancel)
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (hasDragged) {
        upEvent.preventDefault()
        moveTimelineSegmentWithPush(segment.id, latestStartTime, {
          baseProject: dragStartProject,
          recordHistory: true,
        })
      }

      cleanup()
    }

    const handlePointerCancel = () => {
      cleanup()
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerCancel)
  }

  return {
    draggingSegmentId: segmentDragPreview?.segmentId ?? null,
    handleSegmentDragPointerDown,
    segmentDragPreview,
  }
}
