"use client"

import { useCallback, useRef } from "react"

import type {
  StudioEditorProject,
  StudioToolId,
} from "../../studio.types"
import { getTimelineTimeFromClientX } from "../lib/time"
import { useSegmentActions } from "./use-segment-actions"
import { useSegmentResize } from "./use-segment-resize"
import { useTimelinePan } from "./use-timeline-pan"
import { useTimelineZoom } from "./use-timeline-zoom"

export function useTimelineInteractions({
  project,
  seekToTime,
  setActiveTool,
  setSelectedItemId,
  timelineDurationSeconds,
  updateTimelineSegmentTiming,
}: {
  project: StudioEditorProject
  seekToTime: (timeSeconds: number) => void
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
  const timelineViewportRef = useRef<HTMLDivElement | null>(null)
  const timelineSurfaceRef = useRef<HTMLDivElement | null>(null)
  const didResizeSegmentRef = useRef(false)

  const { applyZoomLevel, updateZoom, zoomLevel } = useTimelineZoom({
    timelineViewportRef,
  })

  const getTimelineTime = useCallback(
    (clientX: number) =>
      getTimelineTimeFromClientX({
        clientX,
        surfaceElement: timelineSurfaceRef.current,
        timelineDurationSeconds,
      }),
    [timelineDurationSeconds]
  )

  const seekToTimelineClientX = useCallback(
    (clientX: number) => {
      const nextTime = getTimelineTime(clientX)

      if (nextTime === null) {
        return
      }

      seekToTime(nextTime)
    },
    [getTimelineTime, seekToTime]
  )

  const { handleTimelinePointerDown, isPanningTimeline } = useTimelinePan({
    seekToTimelineClientX,
    timelineViewportRef,
  })

  const { handleSegmentResizePointerDown } = useSegmentResize({
    didResizeSegmentRef,
    getTimelineTime,
    project,
    setActiveTool,
    setSelectedItemId,
    timelineDurationSeconds,
    updateTimelineSegmentTiming,
  })

  const { downloadTimelineSegment, selectTimelineSegment } = useSegmentActions({
    project,
    seekToTimelineClientX,
    setActiveTool,
    setSelectedItemId,
  })

  return {
    applyZoomLevel,
    didResizeSegmentRef,
    downloadTimelineSegment,
    handleSegmentResizePointerDown,
    handleTimelinePointerDown,
    isPanningTimeline,
    selectTimelineSegment,
    timelineSurfaceRef,
    timelineViewportRef,
    updateZoom,
    zoomLevel,
  }
}
