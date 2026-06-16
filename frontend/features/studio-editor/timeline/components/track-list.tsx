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
  getTimelineSegmentEndTime,
  getTimelineSegmentMedia,
  getTimelineSegmentStartTime,
  getTrackContentHeight,
} from "@/features/studio-editor/timeline/lib/layout"
import {
  getTimelineSegmentDisplayText,
  isTextTimelineSegment,
} from "@/features/studio-editor/timeline/lib/display"
import { cn } from "@/lib/utils"
import { getSegmentTopStyle, TimelineSegment } from "./segment"

const timelineLaneClassName =
  "relative min-h-12 border-t border-border/70 py-2 last:border-b"

export function TimelineTrackList({
  didResizeSegmentRef,
  guideAudioItem,
  guideAudioPeaks,
  onDeleteSegment,
  onDownloadSegment,
  onDuplicateSegment,
  onSegmentClick,
  onSegmentContextMenu,
  onSegmentResizeStart,
  project,
  selectedItem,
  sourceAudioPeaks,
  sourceMediaItem,
  timelineDurationSeconds,
}: {
  didResizeSegmentRef: MutableRefObject<boolean>
  guideAudioItem: StudioProjectMediaItem | null
  guideAudioPeaks: number[] | null
  onDeleteSegment: (segmentId: string) => void
  onDownloadSegment: (args: {
    media: StudioProjectMediaItem | null
    segment: StudioTimelineSegment
    trackId: string
  }) => void
  onDuplicateSegment: (segmentId: string) => void
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
  selectedItem: StudioSelection
  sourceAudioPeaks: number[] | null
  sourceMediaItem: StudioProjectMediaItem | null
  timelineDurationSeconds: number
}) {
  return (
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
              style={trackUsesTimedLayout ? { height: trackContentHeight } : undefined}
            >
              {track.segments.map((segment, segmentIndex) => {
                const isSelected =
                  selectedItem.id === segment.id ||
                  selectedItem.id === segment.selectionId
                const segmentMedia =
                  segment.selectionId === project.sourceMedia.id
                    ? sourceMediaItem
                    : getTimelineSegmentMedia({ project, segment })
                const hasTimedSegmentLayout =
                  trackUsesTimedLayout || typeof segment.startTime === "number"
                const segmentStartTime = getTimelineSegmentStartTime({
                  media: segmentMedia,
                  segment,
                })
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
                    ? getSegmentTopStyle({
                        segment,
                        segmentStyle: baseSegmentStyle,
                        track,
                      })
                    : undefined

                return (
                  <TimelineSegment
                    key={segment.id}
                    didResizeSegmentRef={didResizeSegmentRef}
                    displayText={segmentDisplayText}
                    guideAudioItem={guideAudioItem}
                    guideAudioPeaks={guideAudioPeaks}
                    hasTimedSegmentLayout={hasTimedSegmentLayout}
                    isSelected={isSelected}
                    isTextSegment={segmentIsText}
                    onContextMenu={onSegmentContextMenu}
                    onDelete={onDeleteSegment}
                    onDownload={onDownloadSegment}
                    onDuplicate={onDuplicateSegment}
                    onResizeStart={onSegmentResizeStart}
                    onSegmentClick={onSegmentClick}
                    projectMediaThumbnailUrl={project.media.thumbnailUrl}
                    segment={segment}
                    segmentIndex={segmentIndex}
                    segmentMedia={segmentMedia}
                    segmentStyle={segmentStyle}
                    sourceAudioPeaks={sourceAudioPeaks}
                    track={track}
                    trackIndex={trackIndex}
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
