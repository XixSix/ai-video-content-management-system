"use client"

import {
  AudioLines,
  ChevronDown,
  Forward,
  Maximize2,
  Play,
  Rewind,
  Volume2,
  ZoomIn,
  ZoomOut,
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

export const TIMELINE_MIN_HEIGHT = 128
export const TIMELINE_MAX_HEIGHT = 420
export const TIMELINE_DEFAULT_HEIGHT = 168

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

export function StudioTimeline() {
  const { project, selectedItem, setActiveTool, setSelectedItemId } = useStudioEditor()

  return (
    <footer className="flex h-full min-h-0 flex-col border-t border-border bg-[#0b0b0c] text-white">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/8 px-4 text-sm">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-md px-2 text-white hover:bg-white/8 hover:text-white"
            >
              <ChevronDown className="size-4" />
              Hide timeline
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Volume"
              className="text-white hover:bg-white/8 hover:text-white"
            >
              <Volume2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Fullscreen"
              className="text-white hover:bg-white/8 hover:text-white"
            >
              <Maximize2 className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Rewind"
              className="text-white hover:bg-white/8 hover:text-white"
            >
              <Rewind className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Play or pause"
              className="text-white hover:bg-white/8 hover:text-white"
            >
              <Play className="size-4 fill-current" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Forward"
              className="text-white hover:bg-white/8 hover:text-white"
            >
              <Forward className="size-4" />
            </Button>
            <p className="ml-2 font-medium text-white">00:18.22</p>
            <p className="text-white/40">/</p>
            <p className="text-white/72">07:31.09</p>
          </div>

          <div className="flex items-center gap-2">
            <ZoomOut className="size-4 text-white/56" />
            <div className="relative h-1 w-24 rounded-full bg-white/12">
              <div className="absolute left-[42%] top-1/2 size-3 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.08)]" />
            </div>
            <ZoomIn className="size-4 text-white/56" />
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-auto px-4 py-3">
          <div className="pointer-events-none absolute inset-y-3 left-[31%] w-px bg-white/90" />
          <div className="min-w-[980px] space-y-3 pb-1">
            <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
              <div />
              <div className="flex items-center justify-between px-1 text-xs text-white/42">
                <span>0</span>
                <span>15</span>
                <span>30</span>
                <span>45</span>
                <span>60</span>
              </div>
            </div>

            <div className="grid grid-cols-[72px_minmax(0,1fr)] items-start gap-3">
              <div className="flex justify-center pt-6">
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label="Volume"
                  className="size-12 rounded-xl border border-white/10 bg-white/[0.03] text-white hover:bg-white/8 hover:text-white"
                >
                  <Volume2 className="size-5" />
                </Button>
              </div>

              <div className="space-y-3">
                {project.timelineTracks.map((track, trackIndex) => (
                  <div key={track.id} className="rounded-xl bg-white/[0.04] px-3 py-2">
                    {trackIndex === 0 ? (
                      <div className="mb-1 flex items-center justify-between">
                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/80">
                          Fit
                        </span>
                      </div>
                    ) : null}

                    <div className="flex min-w-0 items-center gap-2">
                      {track.segments.map((segment, segmentIndex) => {
                        const isSelected =
                          selectedItem.id === segment.id ||
                          selectedItem.id === segment.selectionId

                        return (
                          <button
                            key={segment.id}
                            type="button"
                            onClick={() => {
                              setActiveTool(getSelectionToolId(track.id, segment.selectionId))
                              setSelectedItemId(segment.id)
                            }}
                            className={cn(
                              "relative h-8 rounded-lg border px-3 text-left text-xs font-medium leading-8 transition",
                              segment.widthClassName,
                              segment.offsetClassName,
                              timelineToneClassName[segment.tone],
                              isSelected
                                ? "shadow-[0_0_0_1px_rgba(125,211,252,0.8)] ring-1 ring-sky-300/80"
                                : "hover:ring-1 hover:ring-white/22"
                            )}
                          >
                            {trackIndex === 0 && segmentIndex === 0 ? (
                              <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
                                <div className="flex h-full w-[190%] items-stretch">
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
                              </div>
                            ) : null}

                            {trackIndex !== 0 ? (
                              track.id === "audio" ? (
                                <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-[linear-gradient(180deg,rgba(173,216,230,0.28),rgba(173,216,230,0.18))]">
                                  <div className="flex h-full items-center gap-[2px] px-2">
                                    {Array.from({ length: 120 }).map((_, barIndex) => (
                                      <span
                                        key={barIndex}
                                        className="w-[2px] rounded-full bg-white/35"
                                        style={{
                                          height: `${22 + ((barIndex * 17) % 55)}%`,
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-white/[0.05]">
                                  <div className="flex h-full items-center gap-[2px] px-2">
                                    {Array.from({ length: 110 }).map((_, barIndex) => (
                                      <span
                                        key={barIndex}
                                        className="w-[2px] rounded-full bg-white/22"
                                        style={{
                                          height: `${18 + ((barIndex * 13) % 48)}%`,
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )
                            ) : null}

                            <span className="relative z-10 truncate">
                              {track.id === "audio" ? (
                                <span className="inline-flex items-center gap-1.5 rounded bg-black/28 px-1.5 py-0.5 leading-none text-[11px] text-white/85">
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
      </div>
    </footer>
  )
}
