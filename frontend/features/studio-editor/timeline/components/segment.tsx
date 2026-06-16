import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
} from "react"
import {
  AudioLines,
  Copy,
  Download,
  ImageIcon,
  Trash2,
  Type,
  Video,
} from "lucide-react"

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

const resizeHandleClassName =
  "absolute inset-y-1 z-20 w-2 cursor-ew-resize rounded-full opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"

const resizeHandleMarkerClassName =
  "before:absolute before:top-1/2 before:h-4 before:w-1 before:-translate-y-1/2 before:rounded-full"

function getResizeHandleToneClassName(trackId: StudioTimelineTrack["id"]) {
  if (trackId === "AUDIO") {
    return "before:bg-cyan-600 dark:before:bg-cyan-300"
  }

  if (trackId === "OVERLAY_MEDIA") {
    return "before:bg-amber-600 dark:before:bg-amber-300"
  }

  return "before:bg-blue-600 dark:before:bg-blue-300"
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
  const canResizeSegment = hasTimedSegmentLayout && track.id !== "SOURCE"
  const isOverlayMedia =
    track.id === "OVERLAY_MEDIA" &&
    (segmentMedia?.type === "IMAGE" || segmentMedia?.type === "VIDEO")
  const overlayThumbnailUrl = segmentMedia?.thumbnailUrl ?? segmentMedia?.assetUrl

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
            "group relative cursor-pointer overflow-hidden rounded-lg border px-3 text-left text-xs font-medium transition",
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
              <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-cyan-500/12">
                <TimelineWaveform
                  barCount={140}
                  className="bg-cyan-600/45 dark:bg-cyan-100/40"
                  peaks={guideAudioPeaks}
                  seed={23}
                />
              </div>
            ) : isOverlayMedia ? (
              <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-amber-500/10">
                {segmentMedia.type === "VIDEO" ? (
                  <TimelineThumbnailStrip thumbnailUrl={overlayThumbnailUrl} />
                ) : overlayThumbnailUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${overlayThumbnailUrl})` }}
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-r from-black/24 via-black/4 to-black/20" />
              </div>
            ) : (
              <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-amber-500/10">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(245,158,11,0.24)_0,rgba(245,158,11,0.24)_1px,transparent_1px,transparent_7px)]" />
              </div>
            )
          ) : null}

          {canResizeSegment ? (
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
                className={cn(
                  resizeHandleClassName,
                  resizeHandleMarkerClassName,
                  getResizeHandleToneClassName(track.id),
                  "left-1 before:left-1"
                )}
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
                className={cn(
                  resizeHandleClassName,
                  resizeHandleMarkerClassName,
                  getResizeHandleToneClassName(track.id),
                  "right-1 before:right-1"
                )}
              />
            </>
          ) : null}

          <span className="relative z-10 flex min-w-0 items-center gap-1.5 truncate">
            {track.id === "AUDIO" ? (
              <span className="inline-flex items-center gap-1.5 rounded bg-background/75 px-1.5 py-0.5 leading-none text-[11px] text-foreground-subtle shadow-sm dark:bg-black/35 dark:text-white/85">
                <AudioLines className="size-3" />
                Audio: {guideAudioItem?.name ?? segment.label}
              </span>
            ) : isTextSegment ? (
              <>
                <Type className="size-3 shrink-0 text-blue-700 dark:text-blue-200" />
                <span className="min-w-0 truncate leading-none">{displayText}</span>
              </>
            ) : isOverlayMedia ? (
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded bg-black/48 px-1.5 py-0.5 leading-none text-[11px] text-white shadow-sm">
                {segmentMedia?.type === "VIDEO" ? (
                  <Video className="size-3 shrink-0" />
                ) : (
                  <ImageIcon className="size-3 shrink-0" />
                )}
                <span className="min-w-0 truncate">{segment.label}</span>
              </span>
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
