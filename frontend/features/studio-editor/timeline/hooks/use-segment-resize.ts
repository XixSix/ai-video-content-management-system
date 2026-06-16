"use client"

import type {
  PointerEvent as ReactPointerEvent,
  MutableRefObject,
} from "react"

import type {
  StudioEditorProject,
  StudioProjectMediaItem,
  StudioTimelineSegment,
  StudioTimelineTrack,
  StudioToolId,
} from "../../studio.types"
import { getSelectionToolId } from "../lib/display"
import { getTimelineSegmentResizeBounds } from "../lib/resize"

export function useSegmentResize({
  didResizeSegmentRef,
  getTimelineTime,
  project,
  setActiveTool,
  setSelectedItemId,
  timelineDurationSeconds,
  updateTimelineSegmentTiming,
}: {
  didResizeSegmentRef: MutableRefObject<boolean>
  getTimelineTime: (clientX: number) => number | null
  project: StudioEditorProject
  setActiveTool: (toolId: StudioToolId) => void
  setSelectedItemId: (selectionId: string) => void
  timelineDurationSeconds: number
  updateTimelineSegmentTiming: (
    segmentId: string,
    timing: {
      durationSeconds: number
      startTime: number
    }
  ) => void
}) {
  const handleSegmentResizePointerDown = ({
    event,
    media,
    segment,
    side,
    trackId,
  }: {
    event: ReactPointerEvent<HTMLElement>
    media: StudioProjectMediaItem | null
    segment: StudioTimelineSegment
    side: "left" | "right"
    trackId: StudioTimelineTrack["id"]
  }) => {
    event.preventDefault()
    event.stopPropagation()

    didResizeSegmentRef.current = false
    setActiveTool(getSelectionToolId(trackId, segment.selectionId))
    setSelectedItemId(segment.id)

    const {
      initialEndTime,
      initialStartTime,
      maxEndTime,
      maxStartTime,
      minEndTime,
      minStartTime,
    } = getTimelineSegmentResizeBounds({
      media,
      project,
      segment,
      timelineDurationSeconds,
      trackId,
    })

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const pointerTime = getTimelineTime(moveEvent.clientX)

      if (pointerTime === null) {
        return
      }

      moveEvent.preventDefault()
      didResizeSegmentRef.current = true

      if (side === "left") {
        const nextStartTime = Math.min(
          maxStartTime,
          Math.max(minStartTime, pointerTime)
        )

        updateTimelineSegmentTiming(segment.id, {
          durationSeconds: initialEndTime - nextStartTime,
          startTime: nextStartTime,
        })
        return
      }

      const nextEndTime = Math.max(
        minEndTime,
        Math.min(maxEndTime, pointerTime)
      )

      updateTimelineSegmentTiming(segment.id, {
        durationSeconds: nextEndTime - initialStartTime,
        startTime: initialStartTime,
      })
    }

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
  }

  return {
    handleSegmentResizePointerDown,
  }
}
