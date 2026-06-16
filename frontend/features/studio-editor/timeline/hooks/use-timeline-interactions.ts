"use client"

import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react"
import { useCallback, useEffect, useRef, useState } from "react"

import type {
  StudioEditorProject,
  StudioProjectMediaItem,
  StudioTimelineSegment,
  StudioTimelineTrack,
  StudioToolId,
} from "../../studio.types"
import {
  TIMELINE_BUTTON_ZOOM_MULTIPLIER,
  TIMELINE_PINCH_ZOOM_SENSITIVITY,
  TIMELINE_SEGMENT_MIN_DURATION,
} from "../constants"
import { getSelectionToolId } from "../lib/display"
import {
  getTimelineSegmentEndTime,
  getTimelineSegmentMedia,
  getTimelineSegmentStartTime,
} from "../lib/layout"
import {
  clampTimelineZoom,
  getTimelineTimeFromClientX,
} from "../lib/time"

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
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isPanningTimeline, setIsPanningTimeline] = useState(false)

  const applyZoomLevel = useCallback((nextZoomLevel: number, anchorClientX?: number) => {
    const viewportElement = timelineViewportRef.current
    const previousScrollWidth = viewportElement?.scrollWidth ?? 0
    const viewportOffset =
      viewportElement && typeof anchorClientX === "number"
        ? anchorClientX - viewportElement.getBoundingClientRect().left
        : viewportElement
          ? viewportElement.clientWidth / 2
          : 0
    const scrollRatio =
      viewportElement && previousScrollWidth > 0
        ? (viewportElement.scrollLeft + viewportOffset) / previousScrollWidth
        : null
    const clampedZoomLevel = Number(clampTimelineZoom(nextZoomLevel).toFixed(3))

    setZoomLevel(clampedZoomLevel)

    if (!viewportElement || scrollRatio === null) {
      return
    }

    window.requestAnimationFrame(() => {
      viewportElement.scrollLeft = scrollRatio * viewportElement.scrollWidth - viewportOffset
    })
  }, [])

  const updateZoom = (direction: "in" | "out") => {
    applyZoomLevel(
      direction === "in"
        ? zoomLevel * TIMELINE_BUTTON_ZOOM_MULTIPLIER
        : zoomLevel / TIMELINE_BUTTON_ZOOM_MULTIPLIER
    )
  }

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

  const handleTimelinePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }

    const targetElement = event.target as HTMLElement
    if (targetElement.closest("button,input,[data-timeline-segment='true']")) {
      return
    }

    const viewportElement = timelineViewportRef.current
    const startClientX = event.clientX
    const startScrollLeft = viewportElement?.scrollLeft ?? 0
    let hasPanned = false

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startClientX

      if (!hasPanned && Math.abs(deltaX) < 8) {
        return
      }

      moveEvent.preventDefault()
      hasPanned = true
      setIsPanningTimeline(true)

      if (viewportElement) {
        viewportElement.scrollLeft = startScrollLeft - deltaX
      }
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (hasPanned) {
        upEvent.preventDefault()
      } else {
        seekToTimelineClientX(upEvent.clientX)
      }

      setIsPanningTimeline(false)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
  }

  const selectTimelineSegment = (
    event: ReactMouseEvent<HTMLButtonElement>,
    track: StudioTimelineTrack,
    segment: StudioTimelineSegment
  ) => {
    setActiveTool(getSelectionToolId(track.id, segment.selectionId))
    setSelectedItemId(segment.id)
    seekToTimelineClientX(event.clientX)
  }

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

    const initialStartTime = getTimelineSegmentStartTime({ media, segment })
    const initialEndTime = getTimelineSegmentEndTime({
      media,
      projectDurationSeconds: project.media.durationSeconds,
      segment,
    })
    const activeLaneIndex = segment.laneIndex ?? 0
    const track = project.timelineTracks.find((timelineTrack) => timelineTrack.id === trackId)
    const trackSegments =
      track?.segments
        .filter((trackSegment) => (trackSegment.laneIndex ?? 0) === activeLaneIndex)
        .map((trackSegment) => {
          const trackSegmentMedia = getTimelineSegmentMedia({
            project,
            segment: trackSegment,
          })
          const startTime = getTimelineSegmentStartTime({
            media: trackSegmentMedia,
            segment: trackSegment,
          })

          return {
            endTime: getTimelineSegmentEndTime({
              media: trackSegmentMedia,
              projectDurationSeconds: project.media.durationSeconds,
              segment: trackSegment,
            }),
            id: trackSegment.id,
            startTime,
          }
        })
        .sort((left, right) => left.startTime - right.startTime) ?? []
    const segmentIndex = trackSegments.findIndex(
      (trackSegment) => trackSegment.id === segment.id
    )
    const previousSegmentEndTime =
      segmentIndex > 0 ? trackSegments[segmentIndex - 1]?.endTime : undefined
    const nextSegmentStartTime =
      segmentIndex >= 0 ? trackSegments[segmentIndex + 1]?.startTime : undefined
    const maxStartTime = initialEndTime - TIMELINE_SEGMENT_MIN_DURATION
    const minStartTime =
      typeof previousSegmentEndTime === "number"
        ? Math.min(previousSegmentEndTime, maxStartTime)
        : 0
    const minEndTime = initialStartTime + TIMELINE_SEGMENT_MIN_DURATION
    const maxEndTime =
      typeof nextSegmentStartTime === "number"
        ? Math.max(minEndTime, nextSegmentStartTime)
        : timelineDurationSeconds

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

  const downloadTimelineSegment = ({
    media,
    segment,
    trackId,
  }: {
    media: StudioProjectMediaItem | null
    segment: StudioTimelineSegment
    trackId: string
  }) => {
    const mediaUrl =
      media?.assetUrl ??
      (segment.selectionId === project.sourceMedia.id ? project.media.streamUrl : null)
    const filename = media?.name ?? `${segment.label}.txt`

    if (mediaUrl) {
      const downloadLink = document.createElement("a")
      downloadLink.href = mediaUrl
      downloadLink.download = filename
      document.body.append(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      return
    }

    const segmentFile = new Blob(
      [
        [
          `Segment: ${segment.label}`,
          `Track: ${trackId}`,
          `Start: ${segment.startTime ?? 0}s`,
          segment.summary,
        ].join("\n"),
      ],
      { type: "text/plain;charset=utf-8" }
    )
    const objectUrl = URL.createObjectURL(segmentFile)
    const downloadLink = document.createElement("a")

    downloadLink.href = objectUrl
    downloadLink.download = filename
    document.body.append(downloadLink)
    downloadLink.click()
    downloadLink.remove()
    URL.revokeObjectURL(objectUrl)
  }

  useEffect(() => {
    const viewportElement = timelineViewportRef.current

    if (!viewportElement) {
      return
    }

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return
      }

      event.preventDefault()
      applyZoomLevel(
        zoomLevel * Math.exp(-event.deltaY * TIMELINE_PINCH_ZOOM_SENSITIVITY),
        event.clientX
      )
    }

    viewportElement.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      viewportElement.removeEventListener("wheel", handleWheel)
    }
  }, [applyZoomLevel, zoomLevel])

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
