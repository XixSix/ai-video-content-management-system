import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
} from "react"
import { AudioLines, Copy, Download, Trash2, Type } from "lucide-react"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import type {
  StudioProjectMediaItem,
  StudioTimelineSegment as StudioTimelineSegmentType,
  StudioTimelineTone,
  StudioTimelineTrack,
} from "@/features/studio-editor/studio.types"
import { cn } from "@/lib/utils"
import { TimelineThumbnailStrip } from "./thumbnail-strip"
import { TimelineWaveform } from "./waveform"

const timelineToneClassName: Record<StudioTimelineTone, string> = {
  base: "border-border bg-foreground/8 text-foreground/72",
  accent: "border-sky-500/25 bg-sky-500/12 text-sky-700 dark:text-sky-300",
  muted: "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300",
}

export function TimelineSegment({
  didResizeSegmentRef,
  displayText,
  guideAudioItem,
  guideAudioPeaks,
  hasTimedSegmentLayout,
  isSelected,
  isTextSegment,
  onContextMenu,
  onDelete,
  onDownload,
  onDuplicate,
  onResizeStart,
  onSegmentClick,
  projectMediaThumbnailUrl,
  segment,
  segmentMedia,
  segmentStyle,
  sourceAudioPeaks,
  track,
}: {
  didResizeSegmentRef: MutableRefObject<boolean>
  displayText: string
  guideAudioItem: StudioProjectMediaItem | null
  guideAudioPeaks: number[] | null
  hasTimedSegmentLayout: boolean
  isSelected: boolean
  isTextSegment: boolean
  onContextMenu: (
    event: ReactMouseEvent<HTMLButtonElement>,
    track: StudioTimelineTrack,
    segment: StudioTimelineSegmentType
  ) => void
  onDelete: (segmentId: string) => void
  onDownload: (args: {
    media: StudioProjectMediaItem | null
    segment: StudioTimelineSegmentType
    trackId: string
  }) => void
  onDuplicate: (segmentId: string) => void
  onResizeStart: (args: {
    event: ReactPointerEvent<HTMLElement>
    media: StudioProjectMediaItem | null
    segment: StudioTimelineSegmentType
    side: "left" | "right"
    trackId: StudioTimelineTrack["id"]
  }) => void
  onSegmentClick: (
    event: ReactMouseEvent<HTMLButtonElement>,
    track: StudioTimelineTrack,
    segment: StudioTimelineSegmentType
  ) => void
  projectMediaThumbnailUrl: string | null
  segment: StudioTimelineSegmentType
  segmentMedia: StudioProjectMediaItem | null
  segmentStyle: CSSProperties | undefined
  sourceAudioPeaks: number[] | null
  track: StudioTimelineTrack
}) {
  return (
    <ContextMenu>
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

            onSegmentClick(event, track, segment)
          }}
          onContextMenu={(event) => {
            event.stopPropagation()
            onContextMenu(event, track, segment)
          }}
          style={segmentStyle}
          className={cn(
            "relative cursor-pointer overflow-hidden rounded-lg border px-3 text-left text-xs font-medium transition",
            track.id === "SOURCE" ? "h-16 leading-8" : "h-8 leading-8",
            hasTimedSegmentLayout ? "absolute top-0 min-w-10" : null,
            hasTimedSegmentLayout ? null : segment.widthClassName,
            hasTimedSegmentLayout ? null : segment.offsetClassName,
            isTextSegment
              ? "border-blue-600 bg-blue-100 text-slate-700 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.2)] hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-500/18 dark:text-blue-50"
              : timelineToneClassName[segment.tone],
            isSelected
              ? isTextSegment
                ? "z-10 border-blue-600 shadow-[0_0_0_2px_rgba(37,99,235,0.45)] ring-0 dark:border-blue-300"
                : "z-10 border-yellow-400 text-foreground shadow-[0_0_0_2px_rgba(250,204,21,0.95)] ring-0"
              : "hover:ring-1 hover:ring-foreground/20"
          )}
        >
          {track.id === "SOURCE" ? (
            <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
              <TimelineThumbnailStrip
                thumbnailUrl={segmentMedia?.thumbnailUrl ?? projectMediaThumbnailUrl}
              />
              <div className="absolute inset-x-0 bottom-0 h-[38%] bg-blue-500/18">
                <TimelineWaveform
                  barCount={160}
                  className="bg-blue-500/38 dark:bg-blue-200/35"
                  peaks={sourceAudioPeaks}
                  seed={19}
                />
              </div>
            </div>
          ) : null}

          {track.id !== "SOURCE" && !isTextSegment ? (
            track.id === "AUDIO" ? (
              <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-blue-500/12">
                <TimelineWaveform
                  barCount={140}
                  className="bg-blue-600/45 dark:bg-blue-100/40"
                  peaks={guideAudioPeaks}
                  seed={23}
                />
              </div>
            ) : (
              <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-foreground/[0.05]">
                <TimelineWaveform
                  barCount={110}
                  className="bg-foreground/25"
                  seed={13}
                />
              </div>
            )
          ) : null}

          {isTextSegment && hasTimedSegmentLayout ? (
            <>
              <span
                aria-hidden="true"
                onPointerDown={(event) =>
                  onResizeStart({
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
                  onResizeStart({
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
            {track.id === "AUDIO" ? (
              <span className="inline-flex items-center gap-1.5 rounded bg-background/70 px-1.5 py-0.5 leading-none text-[11px] text-foreground-subtle shadow-sm dark:bg-black/28 dark:text-white/85">
                <AudioLines className="size-3" />
                Audio: {guideAudioItem?.name ?? segment.label}
              </span>
            ) : isTextSegment ? (
              <>
                <Type className="size-3 shrink-0 text-blue-700 dark:text-blue-200" />
                <span className="min-w-0 truncate leading-none">{displayText}</span>
              </>
            ) : (
              segment.label
            )}
          </span>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44 min-w-44">
        <ContextMenuItem onSelect={() => onDuplicate(segment.id)}>
          <Copy className="size-4" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() =>
            onDownload({
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
          onSelect={() => onDelete(segment.id)}
        >
          <Trash2 className="size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function getSegmentTopStyle({
  segmentStyle,
}: {
  segmentStyle: CSSProperties
}) {
  return {
    ...segmentStyle,
    top: 0,
  }
}
