import type {
  MutableRefObject,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react"

import type {
  StudioEditorProject,
  StudioProjectMediaItem,
  StudioSelection,
  StudioTimelineSegment,
  StudioTimelineTrack,
} from "@/features/studio-editor/studio.types"
import {
  getTimedSegmentStyle,
  getTimelineSegmentMedia,
  getTrackContentHeight,
} from "@/features/studio-editor/timeline/lib/layout"
import {
  getTimelineSegmentDisplayText,
  isTextTimelineSegment,
} from "@/features/studio-editor/timeline/lib/display"
import type { SegmentDragPreview } from "@/features/studio-editor/timeline/hooks/use-segment-drag"
import { cn } from "@/lib/utils"
import { getSegmentTopStyle, TimelineSegment } from "./segment"

const timelineLaneClassName =
  "relative min-h-12 border-t border-border/65 py-1.5 last:border-b"

export function TimelineTrackList({
  didResizeSegmentRef,
  draggingSegmentId,
  guideAudioItem,
  guideAudioPeaks,
  onDeleteSegment,
  onDownloadSegment,
  onDuplicateSegment,
  onSegmentDragStart,
  onSegmentClick,
  onSegmentContextMenu,
  onSegmentResizeStart,
  project,
  segmentDragPreview,
  selectedItem,
  sourceAudioPeaks,
  sourceMediaItem,
  timelineDurationSeconds,
}: {
  didResizeSegmentRef: MutableRefObject<boolean>
  draggingSegmentId: string | null
  guideAudioItem: StudioProjectMediaItem | null
  guideAudioPeaks: number[] | null
  onDeleteSegment: (segmentId: string) => void
  onDownloadSegment: (args: {
    media: StudioProjectMediaItem | null
    segment: StudioTimelineSegment
    trackId: string
  }) => void
  onDuplicateSegment: (segmentId: string) => void
  onSegmentDragStart: (args: {
    event: ReactPointerEvent<HTMLElement>
    media: StudioProjectMediaItem | null
    segment: StudioTimelineSegment
    track: StudioTimelineTrack
  }) => void
  onSegmentClick: (
    event: ReactMouseEvent<HTMLButtonElement>,
    track: StudioTimelineTrack,
    segment: StudioTimelineSegment
  ) => void
  onSegmentContextMenu: (
    event: ReactMouseEvent<HTMLButtonElement>,
    track: StudioTimelineTrack,
    segment: StudioTimelineSegment
  ) => void
  onSegmentResizeStart: (args: {
    event: ReactPointerEvent<HTMLElement>
    media: StudioProjectMediaItem | null
    segment: StudioTimelineSegment
    side: "left" | "right"
    trackId: StudioTimelineTrack["id"]
  }) => void
  project: StudioEditorProject
  segmentDragPreview: SegmentDragPreview | null
  selectedItem: StudioSelection
  sourceAudioPeaks: number[] | null
  sourceMediaItem: StudioProjectMediaItem | null
  timelineDurationSeconds: number
}) {
  return (
    <div className="pb-1">
      {project.timelineTracks.map((track) => {
        const trackUsesTimedLayout =
          track.id === "SOURCE" ||
          track.id === "AUDIO" ||
          track.segments.some((segment) => typeof segment.startTime === "number")
        const trackContentHeight = getTrackContentHeight(track)
        const trackDragPreview =
          segmentDragPreview?.trackId === track.id ? segmentDragPreview : null
        const dragPreviewStyle = trackDragPreview
          ? getSegmentTopStyle({
              segmentStyle: {
                left: `${
                  timelineDurationSeconds > 0
                    ? Math.min(
                        100,
                        Math.max(
                          0,
                          (trackDragPreview.startTime / timelineDurationSeconds) *
                            100
                        )
                      )
                    : 0
                }%`,
                width: `${
                  timelineDurationSeconds > 0
                    ? Math.max(
                        0,
                        Math.min(
                          100,
                          (trackDragPreview.durationSeconds /
                            timelineDurationSeconds) *
                            100
                        )
                      )
                    : 100
                }%`,
              },
            })
          : undefined

        return (
          <div
            key={track.id}
            className={cn(
              timelineLaneClassName,
              track.id === "SOURCE" ? "min-h-[88px]" : null,
              track.id === "TEXT" ? "bg-blue-500/[0.025]" : null,
              track.id === "SOURCE" ? "bg-amber-500/[0.025]" : null,
              track.id === "AUDIO" ? "bg-cyan-500/[0.025]" : null
            )}
          >
            <div
              className={cn(
                "min-w-0 px-0 pl-3",
                trackUsesTimedLayout ? "relative" : "flex items-center gap-2"
              )}
              style={trackUsesTimedLayout ? { height: trackContentHeight } : undefined}
            >
              {trackDragPreview && dragPreviewStyle ? (
                <div
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute z-30 min-w-10 rounded-lg border border-dashed bg-background/18 shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_18%,transparent),0_18px_44px_-30px_rgba(0,0,0,0.8)] backdrop-blur-[1px]",
                    track.id === "AUDIO"
                      ? "border-cyan-300/90"
                      : track.id === "OVERLAY_MEDIA"
                        ? "border-amber-300/90"
                        : "border-blue-300/90",
                    track.id === "SOURCE" ? "h-16" : "h-8"
                  )}
                  style={dragPreviewStyle}
                />
              ) : null}

              {track.segments.map((segment) => {
                const isSelected =
                  selectedItem.id === segment.id ||
                  selectedItem.id === segment.selectionId
                const segmentMedia =
                  segment.selectionId === project.sourceMedia.id
                    ? sourceMediaItem
                    : getTimelineSegmentMedia({ project, segment })
                const hasTimedSegmentLayout =
                  trackUsesTimedLayout || typeof segment.startTime === "number"
                const segmentIsText = isTextTimelineSegment(project, segment)
                const segmentDisplayText = getTimelineSegmentDisplayText({
                  project,
                  segment,
                })
                const baseSegmentStyle = hasTimedSegmentLayout
                  ? getTimedSegmentStyle({
                      media: segmentMedia,
                      projectDurationSeconds: project.media.durationSeconds,
                      segment,
                      timelineDurationSeconds,
                    })
                  : undefined
                const segmentStyle =
                  baseSegmentStyle && hasTimedSegmentLayout
                    ? getSegmentTopStyle({ segmentStyle: baseSegmentStyle })
                    : undefined

                return (
                  <TimelineSegment
                    key={segment.id}
                    didResizeSegmentRef={didResizeSegmentRef}
                    displayText={segmentDisplayText}
                    isDragging={draggingSegmentId === segment.id}
                    guideAudioItem={guideAudioItem}
                    guideAudioPeaks={guideAudioPeaks}
                    hasTimedSegmentLayout={hasTimedSegmentLayout}
                    isSelected={isSelected}
                    isTextSegment={segmentIsText}
                    onContextMenu={onSegmentContextMenu}
                    onDelete={onDeleteSegment}
                    onDownload={onDownloadSegment}
                    onDragStart={onSegmentDragStart}
                    onDuplicate={onDuplicateSegment}
                    onResizeStart={onSegmentResizeStart}
                    onSegmentClick={onSegmentClick}
                    projectMediaThumbnailUrl={project.media.thumbnailUrl}
                    segment={segment}
                    segmentMedia={segmentMedia}
                    segmentStyle={segmentStyle}
                    sourceAudioPeaks={sourceAudioPeaks}
                    track={track}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
