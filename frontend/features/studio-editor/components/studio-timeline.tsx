"use client"

import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  AudioLines,
  ChevronDown,
  Minus,
  Play,
  Plus,
  Scissors,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react"

import { useStudioEditor } from "@/features/studio-editor/studio-editor-context"
import type { StudioTimelineTrack } from "@/features/studio-editor/studio.types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

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

function WaveformBars({
  barCount,
  className,
  seed = 17,
}: {
  barCount: number
  className: string
  seed?: number
}) {
  return (
    <div className="flex h-full w-full items-end gap-px px-1">
      {Array.from({ length: barCount }).map((_, barIndex) => (
        <span
          key={barIndex}
          className={cn("min-w-px flex-1 rounded-t-[1px]", className)}
          style={{
            height: `${18 + ((barIndex * seed + (barIndex % 7) * 11) % 76)}%`,
          }}
        />
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

export function StudioTimeline({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean
  onToggleCollapse: () => void
}) {
  const { currentTime, project, seekToTime, selectedItem, setActiveTool, setSelectedItemId } =
    useStudioEditor()
  const timelineViewportRef = useRef<HTMLDivElement | null>(null)
  const timelineSurfaceRef = useRef<HTMLDivElement | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [mutedTrackIds, setMutedTrackIds] = useState<StudioTimelineTrack["id"][]>([])
  const zoomPercent = getTimelineZoomSliderValue(zoomLevel)
  const timelineWidth = `${Math.round(100 * zoomLevel)}%`
  const timelineMinWidth = Math.round(TIMELINE_BASE_WIDTH * zoomLevel)
  const majorStep = getTimelineMajorStep(project.media.durationSeconds, timelineMinWidth)
  const minorStep = getTimelineMinorStep(majorStep)
  const majorTicks = buildRulerTicks(project.media.durationSeconds, majorStep)
  const minorTicks = buildRulerTicks(project.media.durationSeconds, minorStep).filter(
    (tick) => tick % majorStep !== 0 && tick !== project.media.durationSeconds
  )
  const playheadPercent =
    project.media.durationSeconds > 0
      ? Math.min(100, Math.max(0, (currentTime / project.media.durationSeconds) * 100))
      : 0
  const zoomOutDisabled = zoomLevel <= TIMELINE_ZOOM_MIN
  const zoomInDisabled = zoomLevel >= TIMELINE_ZOOM_MAX
  const toggleTrackMute = (trackId: StudioTimelineTrack["id"]) => {
    setMutedTrackIds((currentMutedTrackIds) =>
      currentMutedTrackIds.includes(trackId)
        ? currentMutedTrackIds.filter((mutedTrackId) => mutedTrackId !== trackId)
        : [...currentMutedTrackIds, trackId]
    )
  }

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

      return seekRatio * project.media.durationSeconds
    },
    [project.media.durationSeconds]
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
    if (!targetElement.closest("button,input")) {
      event.preventDefault()
    }

    seekToTimelineClientX(event.clientX)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      seekToTimelineClientX(moveEvent.clientX)
    }

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
  }

  const seekToTimelineSegment = (event: ReactMouseEvent<HTMLButtonElement>) => {
    seekToTimelineClientX(event.clientX)
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
            "flex h-12 shrink-0 items-center justify-between px-4 text-sm",
            isCollapsed ? null : "border-b border-border"
          )}
        >
          <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Rewind"
              onClick={() => seekToTime(currentTime - 5)}
              className={timelineIconButtonClassName}
            >
              <SkipBack className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Play or pause"
              className={timelineIconButtonClassName}
            >
              <Play className="size-4 fill-current" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Forward"
              onClick={() => seekToTime(currentTime + 5)}
              className={timelineIconButtonClassName}
            >
              <SkipForward className="size-4" />
            </Button>
            <p className="ml-2 font-medium text-foreground">{formatTimeLabel(currentTime)}</p>
            <p className="text-foreground-muted">/</p>
            <p className="font-medium text-foreground">{project.media.durationLabel}</p>
          </div>

          <div className="flex items-center gap-2" aria-label="Timeline zoom">
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
              className="grid min-w-[980px] grid-cols-[72px_minmax(0,1fr)] gap-3 pb-1"
              style={{
                minWidth: `${timelineMinWidth}px`,
                width: timelineWidth,
              }}
            >
              <div className="flex justify-center">
                <div className="w-full">
                  <div className="h-8 border-b border-border/70" />
                  {project.timelineTracks.map((track, trackIndex) => {
                    const trackIsMuted = mutedTrackIds.includes(track.id)

                    return (
                      <div key={track.id} className={timelineLaneClassName}>
                        {trackIndex === 0 ? <div className="mb-1 h-4" /> : null}
                        <div className="flex h-8 items-center justify-center">
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
                className="relative min-w-0 cursor-default select-none bg-surface-raised"
                onPointerDown={handleTimelinePointerDown}
              >
                <div
                  className="pointer-events-none absolute inset-y-0 z-20 w-px bg-foreground/85"
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
                      style={{ left: `${(tick / project.media.durationSeconds) * 100}%` }}
                    />
                  ))}
                  {majorTicks.map((tick) => (
                    <span
                      key={`major-${tick}`}
                      className="absolute top-1 flex -translate-x-1/2 flex-col items-center gap-1"
                      style={{ left: `${(tick / project.media.durationSeconds) * 100}%` }}
                    >
                      <span className="h-2 w-px bg-muted-foreground/35" />
                      <span className="tabular-nums">{formatRulerTimeLabel(tick)}</span>
                    </span>
                  ))}
                </div>

                <div className="pb-1">
                  {project.timelineTracks.map((track, trackIndex) => (
                    <div key={track.id} className={timelineLaneClassName}>
                      {trackIndex === 0 ? (
                        <div className="mb-1 flex h-4 items-center justify-between">
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground-subtle">
                            Fit
                          </span>
                        </div>
                      ) : null}

                      <div className="flex min-w-0 items-center gap-2 px-0">
                        {track.segments.map((segment, segmentIndex) => {
                          const isSelected =
                            selectedItem.id === segment.id ||
                            selectedItem.id === segment.selectionId

                          return (
                            <button
                              key={segment.id}
                              type="button"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                setActiveTool(getSelectionToolId(track.id, segment.selectionId))
                                setSelectedItemId(segment.id)
                                seekToTimelineSegment(event)
                              }}
                              className={cn(
                                "relative h-8 cursor-pointer rounded-lg border px-3 text-left text-xs font-medium leading-8 transition",
                                segment.widthClassName,
                                segment.offsetClassName,
                                timelineToneClassName[segment.tone],
                                isSelected
                                  ? "z-10 border-yellow-400 text-foreground shadow-[0_0_0_2px_rgba(250,204,21,0.95)] ring-0"
                                  : "hover:ring-1 hover:ring-foreground/20"
                              )}
                            >
                              {trackIndex === 0 && segmentIndex === 0 ? (
                                <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
                                  <div className="flex h-[62%] w-[190%] items-stretch">
                                    {Array.from({ length: 24 }).map((_, thumbnailIndex) => (
                                      <div
                                        key={thumbnailIndex}
                                        className={cn(
                                          "relative h-full flex-1 border-r border-black/30",
                                          thumbnailIndex % 3 === 0
                                            ? "bg-[linear-gradient(135deg,#1f3648,#31576f)]"
                                            : thumbnailIndex % 3 === 1
                                              ? "bg-[linear-gradient(135deg,#73402d,#2b1b17)]"
                                              : "bg-[linear-gradient(135deg,#1d4b41,#183326)]"
                                        )}
                                      >
                                        <div className="absolute inset-x-[12%] bottom-[18%] h-[16%] rounded bg-black/60" />
                                        <div className="absolute right-[10%] top-[14%] h-[26%] w-[18%] rounded-full bg-white/22 blur-[1px]" />
                                      </div>
                                    ))}
                                  </div>
                                  <div className="absolute inset-x-0 bottom-0 h-[38%] bg-blue-500/18">
                                    <WaveformBars
                                      barCount={160}
                                      className="bg-blue-500/38 dark:bg-blue-200/35"
                                      seed={19}
                                    />
                                  </div>
                                </div>
                              ) : null}

                              {trackIndex !== 0 ? (
                                track.id === "audio" ? (
                                  <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-blue-500/12">
                                    <WaveformBars
                                      barCount={140}
                                      className="bg-blue-600/45 dark:bg-blue-100/40"
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

                              <span className="relative z-10 truncate">
                                {track.id === "audio" ? (
                                  <span className="inline-flex items-center gap-1.5 rounded bg-background/70 px-1.5 py-0.5 leading-none text-[11px] text-foreground-subtle shadow-sm dark:bg-black/28 dark:text-white/85">
                                    <AudioLines className="size-3" />
                                    Audio: english.m4a
                                  </span>
                                ) : (
                                  segment.label
                                )}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </footer>
  )
}
