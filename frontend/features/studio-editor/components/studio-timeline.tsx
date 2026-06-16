"use client"

import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AudioLines,
  ChevronDown,
  Copy,
  Download,
  Minus,
  Pause,
  Play,
  Plus,
  Scissors,
  SkipBack,
  SkipForward,
  Trash2,
  Type,
  Volume2,
  VolumeX,
} from "lucide-react"

import { useStudioEditor } from "@/features/studio-editor/studio-editor-context"
import type {
  StudioEditorProject,
  StudioProjectMediaItem,
  StudioTimelineSegment,
  StudioTimelineTrack,
} from "@/features/studio-editor/studio.types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

const timelineToneClassName = {
  base: "border-border bg-foreground/8 text-foreground/72",
  accent: "border-sky-500/25 bg-sky-500/12 text-sky-700 dark:text-sky-300",
  muted: "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300",
} as const

const timelineLaneClassName =
  "relative min-h-12 border-t border-border/70 py-2 last:border-b"
const timelineIconButtonClassName =
  "grid place-items-center text-foreground-muted hover:bg-accent hover:text-foreground"
const TIMELINE_ZOOM_MIN = 1
const TIMELINE_ZOOM_MAX = 48
const TIMELINE_BUTTON_ZOOM_MULTIPLIER = 1.25
const TIMELINE_PINCH_ZOOM_SENSITIVITY = 0.004
const TIMELINE_BASE_WIDTH = 980
const TIMELINE_TARGET_TICK_WIDTH = 140
const TIMELINE_SEGMENT_MIN_DURATION = 0.5
const TIMELINE_DEFAULT_LANE_HEIGHT = 32
const TIMELINE_VIDEO_LANE_HEIGHT = 64
const TIMELINE_MAJOR_INTERVALS = [
  5, 10, 15, 30, 60, 120, 180, 300, 600, 900, 1800,
] as const

export const TIMELINE_MIN_HEIGHT = 128
export const TIMELINE_MAX_HEIGHT = 420
export const TIMELINE_DEFAULT_HEIGHT = 168
export const TIMELINE_COLLAPSED_HEIGHT = 48

function formatTimeLabel(totalSeconds: number) {
  const clampedSeconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(clampedSeconds / 3600)
  const minutes = Math.floor((clampedSeconds % 3600) / 60)
  const seconds = clampedSeconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function formatRulerTimeLabel(totalSeconds: number) {
  const clampedSeconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(clampedSeconds / 3600)
  const minutes = Math.floor((clampedSeconds % 3600) / 60)
  const seconds = clampedSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function getTimelineMajorStep(durationSeconds: number, timelinePixelWidth: number) {
  const targetTickCount = Math.max(2, Math.floor(timelinePixelWidth / TIMELINE_TARGET_TICK_WIDTH))
  const rawStep = durationSeconds / targetTickCount

  return (
    TIMELINE_MAJOR_INTERVALS.find((interval) => interval >= rawStep) ??
    TIMELINE_MAJOR_INTERVALS.at(-1) ??
    300
  )
}

function getTimelineMinorStep(majorStep: number) {
  if (majorStep >= 300) {
    return 60
  }

  if (majorStep >= 120) {
    return 30
  }

  if (majorStep >= 60) {
    return 15
  }

  if (majorStep >= 30) {
    return 5
  }

  return Math.max(1, majorStep / 5)
}

function buildRulerTicks(durationSeconds: number, stepSeconds: number) {
  const ticks: number[] = []

  for (let time = 0; time < durationSeconds; time += stepSeconds) {
    ticks.push(Number(time.toFixed(2)))
  }

  const roundedDuration = Number(durationSeconds.toFixed(2))
  if (ticks.at(-1) !== roundedDuration) {
    ticks.push(roundedDuration)
  }

  return ticks
}

function buildFallbackPeaks(barCount: number, seed: number) {
  return Array.from({ length: barCount }).map(
    (_, barIndex) => (18 + ((barIndex * seed + (barIndex % 7) * 11) % 76)) / 100
  )
}

function buildAudioPeaks(audioBuffer: AudioBuffer, barCount: number) {
  const channelData = audioBuffer.getChannelData(0)
  const samplesPerBar = Math.max(1, Math.floor(channelData.length / barCount))
  const peaks = Array.from({ length: barCount }).map((_, barIndex) => {
    const startIndex = barIndex * samplesPerBar
    const endIndex = Math.min(channelData.length, startIndex + samplesPerBar)
    let peak = 0

    for (let sampleIndex = startIndex; sampleIndex < endIndex; sampleIndex += 1) {
      peak = Math.max(peak, Math.abs(channelData[sampleIndex] ?? 0))
    }

    return peak
  })
  const maxPeak = Math.max(...peaks, 0.01)

  return peaks.map((peak) => Math.max(0.08, peak / maxPeak))
}

function useAudioPeaks(sourceUrl: string | null | undefined, barCount: number) {
  const [peaksState, setPeaksState] = useState<{
    peaks: number[]
    sourceUrl: string
  } | null>(null)

  useEffect(() => {
    if (!sourceUrl) {
      return
    }

    let isCancelled = false
    let isClosed = false
    const AudioContextConstructor =
      window.AudioContext ??
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext

    if (!AudioContextConstructor) {
      return
    }

    const audioContext = new AudioContextConstructor()

    const loadPeaks = async () => {
      try {
        const response = await fetch(sourceUrl)
        const audioData = await response.arrayBuffer()
        const audioBuffer = await audioContext.decodeAudioData(audioData)

        if (!isCancelled) {
          setPeaksState({
            peaks: buildAudioPeaks(audioBuffer, barCount),
            sourceUrl,
          })
        }
      } catch {
        if (!isCancelled) {
          setPeaksState(null)
        }
      } finally {
        if (!isClosed) {
          isClosed = true
          void audioContext.close()
        }
      }
    }

    void loadPeaks()

    return () => {
      isCancelled = true
      if (!isClosed) {
        isClosed = true
        void audioContext.close()
      }
    }
  }, [barCount, sourceUrl])

  if (!peaksState || peaksState.sourceUrl !== sourceUrl) {
    return null
  }

  return peaksState.peaks
}

function WaveformBars({
  barCount,
  className,
  peaks,
  seed = 17,
}: {
  barCount: number
  className: string
  peaks?: number[] | null
  seed?: number
}) {
  const bars = peaks ?? buildFallbackPeaks(barCount, seed)

  return (
    <div className="flex h-full w-full items-end gap-px px-1">
      {bars.map((peak, barIndex) => (
        <span
          key={barIndex}
          className={cn("min-w-px flex-1 rounded-t-[1px]", className)}
          style={{
            height: `${Math.round(12 + peak * 88)}%`,
          }}
        />
      ))}
    </div>
  )
}

function TimelineThumbnailStrip({
  thumbnailUrl,
}: {
  thumbnailUrl: string | null | undefined
}) {
  if (!thumbnailUrl) {
    return null
  }

  return (
    <div className="flex h-[62%] w-[190%] items-stretch">
      {Array.from({ length: 18 }).map((_, thumbnailIndex) => (
        <div
          key={thumbnailIndex}
          className="relative h-full flex-1 border-r border-black/30 bg-cover bg-center"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
        >
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/20" />
        </div>
      ))}
    </div>
  )
}

function clampTimelineZoom(zoomLevel: number) {
  return Math.min(TIMELINE_ZOOM_MAX, Math.max(TIMELINE_ZOOM_MIN, zoomLevel))
}

function getTimelineZoomSliderValue(zoomLevel: number) {
  const normalizedZoom = clampTimelineZoom(zoomLevel)

  return (
    (Math.log(normalizedZoom / TIMELINE_ZOOM_MIN) /
      Math.log(TIMELINE_ZOOM_MAX / TIMELINE_ZOOM_MIN)) *
    100
  )
}

function getTimelineZoomFromSliderValue(sliderValue: number) {
  return clampTimelineZoom(
    TIMELINE_ZOOM_MIN *
      (TIMELINE_ZOOM_MAX / TIMELINE_ZOOM_MIN) ** (sliderValue / 100)
  )
}

function getTrackToolId(trackId: StudioTimelineTrack["id"]) {
  if (trackId === "captions") {
    return "captions"
  }

  if (trackId === "audio") {
    return "audio"
  }

  if (trackId === "overlays") {
    return "text"
  }

  return "media"
}

function getSelectionToolId(trackId: StudioTimelineTrack["id"], selectionId: string) {
  if (selectionId === "brand-mark") {
    return "assets"
  }

  if (selectionId === "hook-copy") {
    return "text"
  }

  if (selectionId === "captions") {
    return "captions"
  }

  if (selectionId === "audio-bed") {
    return "audio"
  }

  return getTrackToolId(trackId)
}

function getTrackLaneCount(track: StudioTimelineTrack) {
  return Math.max(
    1,
    ...track.segments.map((segment) => (segment.laneIndex ?? 0) + 1)
  )
}

function getTrackLaneHeight(trackId: StudioTimelineTrack["id"]) {
  return trackId === "video" ? TIMELINE_VIDEO_LANE_HEIGHT : TIMELINE_DEFAULT_LANE_HEIGHT
}

function getTrackContentHeight(track: StudioTimelineTrack) {
  return getTrackLaneCount(track) * getTrackLaneHeight(track.id)
}

function getTimedSegmentStyle({
  media,
  projectDurationSeconds,
  segment,
  timelineDurationSeconds,
}: {
  media: StudioProjectMediaItem | null
  projectDurationSeconds: number
  segment: StudioTimelineSegment
  timelineDurationSeconds: number
}) {
  const startTime = Math.max(0, segment.startTime ?? media?.startTime ?? 0)
  const widthSeconds = getTimelineSegmentDuration({
    media,
    projectDurationSeconds,
    segment,
  })
  const leftPercent =
    timelineDurationSeconds > 0
      ? Math.min(100, (startTime / timelineDurationSeconds) * 100)
      : 0
  const widthPercent =
    timelineDurationSeconds > 0
      ? Math.max(
          0,
          Math.min(100 - leftPercent, (widthSeconds / timelineDurationSeconds) * 100)
        )
      : 100

  return {
    left: `${leftPercent}%`,
    width: `${widthPercent}%`,
  }
}

function getTimelineSegmentDuration({
  media,
  projectDurationSeconds,
  segment,
}: {
  media: StudioProjectMediaItem | null
  projectDurationSeconds: number
  segment: StudioTimelineSegment
}) {
  const widthPercent = segment.widthClassName.match(/w-\[(\d+(?:\.\d+)?)%\]/)
  const widthDuration =
    widthPercent && projectDurationSeconds > 0
      ? (Number(widthPercent[1]) / 100) * projectDurationSeconds
      : null

  return Math.max(
    0,
    segment.durationSeconds ??
      media?.durationSeconds ??
      widthDuration ??
      projectDurationSeconds
  )
}

function getTimelineSegmentStartTime({
  media,
  segment,
}: {
  media: StudioProjectMediaItem | null
  segment: StudioTimelineSegment
}) {
  return Math.max(0, segment.startTime ?? media?.startTime ?? 0)
}

function getTimelineSegmentEndTime({
  media,
  projectDurationSeconds,
  segment,
}: {
  media: StudioProjectMediaItem | null
  projectDurationSeconds: number
  segment: StudioTimelineSegment
}) {
  const startTime = getTimelineSegmentStartTime({ media, segment })

  return startTime + getTimelineSegmentDuration({
    media,
    projectDurationSeconds,
    segment,
  })
}

function getCaptionSegmentText({
  project,
  segment,
  segmentEndTime,
  segmentStartTime,
}: {
  project: StudioEditorProject
  segment: StudioTimelineSegment
  segmentEndTime: number
  segmentStartTime: number
}) {
  const overlappingSegments = project.transcriptSegments.filter(
    (transcriptSegment) =>
      transcriptSegment.startTime < segmentEndTime &&
      transcriptSegment.endTime > segmentStartTime
  )

  return (
    overlappingSegments.map((transcriptSegment) => transcriptSegment.text).join(" ") ||
    segment.label
  )
}

function getTimelineSegmentDisplayText({
  project,
  segment,
  segmentEndTime,
  segmentStartTime,
}: {
  project: StudioEditorProject
  segment: StudioTimelineSegment
  segmentEndTime: number
  segmentStartTime: number
}) {
  if (segment.content) {
    return segment.content
  }

  const linkedLayer = project.layers.find((layer) => layer.id === segment.selectionId)

  if (linkedLayer?.kind === "text") {
    return linkedLayer.content ?? linkedLayer.label
  }

  if (linkedLayer?.kind === "captions") {
    return getCaptionSegmentText({
      project,
      segment,
      segmentEndTime,
      segmentStartTime,
    })
  }

  return segment.label
}

function isTextTimelineSegment(project: StudioEditorProject, segment: StudioTimelineSegment) {
  const linkedLayer = project.layers.find((layer) => layer.id === segment.selectionId)

  return linkedLayer?.kind === "text" || linkedLayer?.kind === "captions"
}

export function StudioTimeline({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean
  onToggleCollapse: () => void
}) {
  const {
    currentTime,
    deleteTimelineSegment,
    duplicateTimelineSegment,
    isPlaying,
    mutedTrackIds,
    project,
    seekToTime,
    selectedItem,
    setActiveTool,
    setSelectedItemId,
    togglePlayback,
    toggleTrackMute,
    updateTimelineSegmentTiming,
  } = useStudioEditor()
  const timelineViewportRef = useRef<HTMLDivElement | null>(null)
  const timelineSurfaceRef = useRef<HTMLDivElement | null>(null)
  const didResizeSegmentRef = useRef(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isPanningTimeline, setIsPanningTimeline] = useState(false)
  const sourceMediaItem = useMemo(
    () =>
      project.projectMedia.find(
        (item) => item.linkedSelectionId === project.sourceMedia.id || item.origin === "SOURCE"
      ) ?? null,
    [project.projectMedia, project.sourceMedia.id]
  )
  const guideAudioItem = useMemo(
    () => project.projectMedia.find((item) => item.linkedSelectionId === "audio-bed") ?? null,
    [project.projectMedia]
  )
  const timelineDurationSeconds = useMemo(() => {
    const segmentEndTimes = project.timelineTracks.flatMap((track) =>
      track.segments.map((segment) => {
        const segmentMedia =
          segment.selectionId === project.sourceMedia.id
            ? sourceMediaItem
            : project.projectMedia.find(
                (item) => item.linkedSelectionId === segment.selectionId
              ) ?? null

        return getTimelineSegmentEndTime({
          media: segmentMedia,
          projectDurationSeconds: project.media.durationSeconds,
          segment,
        })
      })
    )

    return Math.max(project.media.durationSeconds, ...segmentEndTimes)
  }, [
    project.media.durationSeconds,
    project.projectMedia,
    project.sourceMedia.id,
    project.timelineTracks,
    sourceMediaItem,
  ])
  const sourceAudioPeaks = useAudioPeaks(project.media.streamUrl || sourceMediaItem?.assetUrl, 160)
  const guideAudioPeaks = useAudioPeaks(guideAudioItem?.assetUrl, 140)
  const zoomPercent = getTimelineZoomSliderValue(zoomLevel)
  const timelineScaleDuration = Math.max(1, project.media.durationSeconds)
  const timelineContentWidth = Math.round(
    TIMELINE_BASE_WIDTH *
      zoomLevel *
      Math.max(1, timelineDurationSeconds / timelineScaleDuration)
  )
  const timelineGridWidth = timelineContentWidth + 72
  const majorStep = getTimelineMajorStep(timelineDurationSeconds, timelineContentWidth)
  const minorStep = getTimelineMinorStep(majorStep)
  const majorTicks = buildRulerTicks(timelineDurationSeconds, majorStep)
  const minorTicks = buildRulerTicks(timelineDurationSeconds, minorStep).filter(
    (tick) => tick % majorStep !== 0 && tick !== timelineDurationSeconds
  )
  const playheadPercent =
    timelineDurationSeconds > 0
      ? Math.min(100, Math.max(0, (currentTime / timelineDurationSeconds) * 100))
      : 0
  const zoomOutDisabled = zoomLevel <= TIMELINE_ZOOM_MIN
  const zoomInDisabled = zoomLevel >= TIMELINE_ZOOM_MAX
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

  const getTimelineTimeFromClientX = useCallback(
    (clientX: number) => {
      const surfaceElement = timelineSurfaceRef.current

      if (!surfaceElement) {
        return null
      }

      const surfaceRect = surfaceElement.getBoundingClientRect()
      const seekRatio = Math.min(
        1,
        Math.max(0, (clientX - surfaceRect.left) / surfaceRect.width)
      )

      return seekRatio * timelineDurationSeconds
    },
    [timelineDurationSeconds]
  )

  const seekToTimelineClientX = useCallback(
    (clientX: number) => {
      const nextTime = getTimelineTimeFromClientX(clientX)

      if (nextTime === null) {
        return
      }

      seekToTime(nextTime)
    },
    [getTimelineTimeFromClientX, seekToTime]
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

  const seekToTimelineSegment = (event: ReactMouseEvent<HTMLButtonElement>) => {
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
          const trackSegmentMedia =
            trackSegment.selectionId === project.sourceMedia.id
              ? sourceMediaItem
              : project.projectMedia.find(
                  (item) => item.linkedSelectionId === trackSegment.selectionId
                ) ?? null
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
      const pointerTime = getTimelineTimeFromClientX(moveEvent.clientX)

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

  return (
    <footer className="flex h-full min-h-0 flex-col border-t border-border bg-surface-raised text-foreground">
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "relative flex h-12 shrink-0 items-center px-4 text-sm",
            isCollapsed ? null : "border-b border-border"
          )}
        >
          <div className="relative z-10 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-8 rounded-md px-2 text-foreground hover:bg-accent hover:text-foreground"
            >
              <ChevronDown className="size-4" />
              {isCollapsed ? "Show timeline" : "Hide timeline"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Split track"
              className="h-8 rounded-md px-2 text-foreground hover:bg-accent hover:text-foreground"
            >
              <Scissors className="size-4" />
              Split track
            </Button>
          </div>

          <div className="absolute left-1/2 top-1/2 z-10 h-8 w-72 -translate-x-1/2 -translate-y-1/2">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Rewind"
              onClick={() => seekToTime(currentTime - 5)}
              className={cn(
                timelineIconButtonClassName,
                "absolute left-[calc(50%-2.25rem)] top-1/2 -translate-x-1/2 -translate-y-1/2"
              )}
            >
              <SkipBack className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={isPlaying ? "Pause" : "Play"}
              aria-pressed={isPlaying}
              onClick={togglePlayback}
              className={cn(
                timelineIconButtonClassName,
                "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              )}
            >
              {isPlaying ? (
                <Pause className="size-4 fill-current" />
              ) : (
                <Play className="size-4 fill-current" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Forward"
              onClick={() => seekToTime(currentTime + 5)}
              className={cn(
                timelineIconButtonClassName,
                "absolute left-[calc(50%+2.25rem)] top-1/2 -translate-x-1/2 -translate-y-1/2"
              )}
            >
              <SkipForward className="size-4" />
            </Button>
            <div className="absolute left-[calc(50%+4.75rem)] top-1/2 flex -translate-y-1/2 items-center gap-2">
              <p className="font-medium text-foreground">{formatTimeLabel(currentTime)}</p>
              <p className="text-foreground-muted">/</p>
              <p className="font-medium text-foreground">
                {formatTimeLabel(timelineDurationSeconds)}
              </p>
            </div>
          </div>

          <div className="relative z-10 ml-auto flex items-center gap-2" aria-label="Timeline zoom">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom out"
              disabled={zoomOutDisabled}
              onClick={() => updateZoom("out")}
              className={timelineIconButtonClassName}
            >
              <Minus className="size-4" />
            </Button>
            <div className="relative flex h-5 w-28 items-center">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={zoomPercent}
                aria-label="Timeline zoom level"
                onChange={(event) =>
                  applyZoomLevel(getTimelineZoomFromSliderValue(Number(event.target.value)))
                }
                className="h-5 w-full cursor-pointer appearance-none bg-transparent accent-foreground [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-foreground [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--foreground)_8%,transparent)]"
              />
              <span
                className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-foreground/25"
                style={{ width: `${zoomPercent}%` }}
              />
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom in"
              disabled={zoomInDisabled}
              onClick={() => updateZoom("in")}
              className={timelineIconButtonClassName}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {isCollapsed ? null : (
          <div
            ref={timelineViewportRef}
            className="relative min-h-0 flex-1 overflow-auto px-4 py-3"
          >
            <div
              className="grid min-w-[980px] grid-cols-[72px_minmax(0,1fr)] pb-1"
              style={{
                minWidth: `${timelineGridWidth}px`,
                width: `${timelineGridWidth}px`,
              }}
            >
              <div className="flex justify-center border-r border-border/80">
                <div className="w-full">
                  <div className="h-8 border-b border-border/70" />
                  {project.timelineTracks.map((track, trackIndex) => {
                    const trackIsMuted = mutedTrackIds.includes(track.id)
                    const trackContentHeight = getTrackContentHeight(track)

                    return (
                      <div
                        key={track.id}
                        className={cn(
                          timelineLaneClassName,
                          track.id === "video" ? "min-h-[88px]" : null
                        )}
                      >
                        {trackIndex === 0 ? <div className="mb-1 h-4" /> : null}
                        <div
                          className="flex items-center justify-center"
                          style={{ height: trackContentHeight }}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={
                              trackIsMuted
                                ? `Unmute ${track.label} track`
                                : `Mute ${track.label} track`
                            }
                            aria-pressed={trackIsMuted}
                            onClick={() => toggleTrackMute(track.id)}
                            className="text-foreground-muted hover:bg-accent hover:text-foreground"
                          >
                            {trackIsMuted ? (
                              <VolumeX className="size-4" />
                            ) : (
                              <Volume2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div
                ref={timelineSurfaceRef}
                className={cn(
                  "relative min-w-0 select-none bg-surface-raised",
                  isPanningTimeline ? "cursor-grabbing" : "cursor-grab"
                )}
                onPointerDown={handleTimelinePointerDown}
              >
                <div
                  className="pointer-events-none absolute inset-y-0 z-20 w-px bg-foreground/85 will-change-[left]"
                  style={{ left: `${playheadPercent}%` }}
                >
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 rounded-md bg-foreground px-1.5 py-0.5 text-[11px] font-medium leading-none text-background">
                    {formatRulerTimeLabel(currentTime)}
                  </span>
                </div>

                <div className="relative h-8 border-b border-border/70 px-1 text-xs text-foreground-muted">
                  <div className="absolute inset-x-0 top-4 h-px bg-border" />
                  {minorTicks.map((tick) => (
                    <span
                      key={`minor-${tick}`}
                      className="absolute top-[13px] h-1.5 w-px bg-border"
                      style={{ left: `${(tick / timelineDurationSeconds) * 100}%` }}
                    />
                  ))}
                  {majorTicks.map((tick) => (
                    <span
                      key={`major-${tick}`}
                      className="absolute top-1 flex -translate-x-1/2 flex-col items-center gap-1"
                      style={{ left: `${(tick / timelineDurationSeconds) * 100}%` }}
                    >
                      <span className="h-2 w-px bg-muted-foreground/35" />
                      <span className="tabular-nums">{formatRulerTimeLabel(tick)}</span>
                    </span>
                  ))}
                </div>

                <div className="pb-1">
                  {project.timelineTracks.map((track, trackIndex) => {
                    const trackUsesTimedLayout =
                      track.id === "video" ||
                      track.id === "audio" ||
                      track.segments.some((segment) => typeof segment.startTime === "number")
                    const trackContentHeight = getTrackContentHeight(track)

                    return (
                      <div
                        key={track.id}
                        className={cn(
                          timelineLaneClassName,
                          track.id === "video" ? "min-h-[88px]" : null
                        )}
                      >
                        {trackIndex === 0 ? (
                          <div className="mb-1 ml-3 flex h-4 items-center justify-between">
                            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground-subtle">
                              Fit
                            </span>
                          </div>
                        ) : null}

                        <div
                          className={cn(
                            "min-w-0 px-0 pl-3",
                            trackUsesTimedLayout ? "relative" : "flex items-center gap-2"
                          )}
                          style={
                            trackUsesTimedLayout
                              ? { height: trackContentHeight }
                              : undefined
                          }
                        >
                          {track.segments.map((segment, segmentIndex) => {
                            const isSelected =
                              selectedItem.id === segment.id ||
                              selectedItem.id === segment.selectionId
                            const segmentMedia =
                              segment.selectionId === project.sourceMedia.id
                                ? sourceMediaItem
                                : project.projectMedia.find(
                                    (item) => item.linkedSelectionId === segment.selectionId
                                  ) ?? null
                            const hasTimedSegmentLayout =
                              trackUsesTimedLayout || typeof segment.startTime === "number"
                            const segmentStartTime = Math.max(
                              0,
                              segment.startTime ?? segmentMedia?.startTime ?? 0
                            )
                            const segmentEndTime = getTimelineSegmentEndTime({
                              media: segmentMedia,
                              projectDurationSeconds: project.media.durationSeconds,
                              segment,
                            })
                            const segmentIsText = isTextTimelineSegment(project, segment)
                            const segmentDisplayText = getTimelineSegmentDisplayText({
                              project,
                              segment,
                              segmentEndTime,
                              segmentStartTime,
                            })

                            return (
                              <ContextMenu key={segment.id}>
                                <ContextMenuTrigger asChild>
                                  <button
                                    data-timeline-segment="true"
                                    type="button"
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={(event) => {
                                      event.stopPropagation()

                                      if (didResizeSegmentRef.current) {
                                        didResizeSegmentRef.current = false
                                        return
                                      }

                                      setActiveTool(
                                        getSelectionToolId(track.id, segment.selectionId)
                                      )
                                      setSelectedItemId(segment.id)
                                      seekToTimelineSegment(event)
                                    }}
                                    onContextMenu={(event) => {
                                      event.stopPropagation()
                                      setActiveTool(
                                        getSelectionToolId(track.id, segment.selectionId)
                                      )
                                      setSelectedItemId(segment.id)
                                      seekToTimelineSegment(event)
                                    }}
                                    style={
                                      hasTimedSegmentLayout
                                        ? {
                                            ...getTimedSegmentStyle({
                                              media: segmentMedia,
                                              projectDurationSeconds:
                                                project.media.durationSeconds,
                                              segment,
                                              timelineDurationSeconds,
                                            }),
                                            top:
                                              (segment.laneIndex ?? 0) *
                                              getTrackLaneHeight(track.id),
                                          }
                                        : undefined
                                    }
                                    className={cn(
                                      "relative cursor-pointer overflow-hidden rounded-lg border px-3 text-left text-xs font-medium transition",
                                      track.id === "video" ? "h-16 leading-8" : "h-8 leading-8",
                                      hasTimedSegmentLayout ? "absolute top-0 min-w-10" : null,
                                      hasTimedSegmentLayout ? null : segment.widthClassName,
                                      hasTimedSegmentLayout ? null : segment.offsetClassName,
                                      segmentIsText
                                        ? "border-blue-600 bg-blue-100 text-slate-700 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.2)] hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-500/18 dark:text-blue-50"
                                        : timelineToneClassName[segment.tone],
                                      isSelected
                                        ? segmentIsText
                                          ? "z-10 border-blue-600 shadow-[0_0_0_2px_rgba(37,99,235,0.45)] ring-0 dark:border-blue-300"
                                          : "z-10 border-yellow-400 text-foreground shadow-[0_0_0_2px_rgba(250,204,21,0.95)] ring-0"
                                        : "hover:ring-1 hover:ring-foreground/20"
                                    )}
                                  >
                              {trackIndex === 0 && segmentIndex === 0 ? (
                                <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
                                  <TimelineThumbnailStrip
                                    thumbnailUrl={
                                      segmentMedia?.thumbnailUrl ?? project.media.thumbnailUrl
                                    }
                                  />
                                  <div className="absolute inset-x-0 bottom-0 h-[38%] bg-blue-500/18">
                                    <WaveformBars
                                      barCount={160}
                                      className="bg-blue-500/38 dark:bg-blue-200/35"
                                      peaks={sourceAudioPeaks}
                                      seed={19}
                                    />
                                  </div>
                                </div>
                              ) : null}

                              {trackIndex !== 0 && !segmentIsText ? (
                                track.id === "audio" ? (
                                  <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-blue-500/12">
                                    <WaveformBars
                                      barCount={140}
                                      className="bg-blue-600/45 dark:bg-blue-100/40"
                                      peaks={guideAudioPeaks}
                                      seed={23}
                                    />
                                  </div>
                                ) : (
                                  <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-foreground/[0.05]">
                                    <WaveformBars
                                      barCount={110}
                                      className="bg-foreground/25"
                                      seed={13}
                                    />
                                  </div>
                                )
                              ) : null}

                              {segmentIsText && hasTimedSegmentLayout ? (
                                <>
                                  <span
                                    aria-hidden="true"
                                    onPointerDown={(event) =>
                                      handleSegmentResizePointerDown({
                                        event,
                                        media: segmentMedia,
                                        segment,
                                        side: "left",
                                        trackId: track.id,
                                      })
                                    }
                                    className="absolute inset-y-1 left-1 z-20 w-2 cursor-ew-resize rounded-full before:absolute before:left-1 before:top-1/2 before:h-4 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-blue-600 dark:before:bg-blue-300"
                                  />
                                  <span
                                    aria-hidden="true"
                                    onPointerDown={(event) =>
                                      handleSegmentResizePointerDown({
                                        event,
                                        media: segmentMedia,
                                        segment,
                                        side: "right",
                                        trackId: track.id,
                                      })
                                    }
                                    className="absolute inset-y-1 right-1 z-20 w-2 cursor-ew-resize rounded-full before:absolute before:right-1 before:top-1/2 before:h-4 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-blue-600 dark:before:bg-blue-300"
                                  />
                                </>
                              ) : null}

                              <span className="relative z-10 flex min-w-0 items-center gap-1.5 truncate">
                                {track.id === "audio" ? (
                                  <span className="inline-flex items-center gap-1.5 rounded bg-background/70 px-1.5 py-0.5 leading-none text-[11px] text-foreground-subtle shadow-sm dark:bg-black/28 dark:text-white/85">
                                    <AudioLines className="size-3" />
                                    Audio: {guideAudioItem?.name ?? segment.label}
                                  </span>
                                ) : segmentIsText ? (
                                  <>
                                    <Type className="size-3 shrink-0 text-blue-700 dark:text-blue-200" />
                                    <span className="min-w-0 truncate leading-none">
                                      {segmentDisplayText}
                                    </span>
                                  </>
                                ) : (
                                  segment.label
                                )}
                              </span>
                                  </button>
                              </ContextMenuTrigger>
                              <ContextMenuContent className="w-44 min-w-44">
                                <ContextMenuItem
                                  onSelect={() => duplicateTimelineSegment(segment.id)}
                                >
                                  <Copy className="size-4" />
                                  Duplicate
                                </ContextMenuItem>
                                <ContextMenuItem
                                  onSelect={() =>
                                    downloadTimelineSegment({
                                      media: segmentMedia,
                                      segment,
                                      trackId: track.id,
                                    })
                                  }
                                >
                                  <Download className="size-4" />
                                  Download
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem
                                  variant="destructive"
                                  onSelect={() => deleteTimelineSegment(segment.id)}
                                >
                                  <Trash2 className="size-4" />
                                  Delete
                                </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </footer>
  )
}
