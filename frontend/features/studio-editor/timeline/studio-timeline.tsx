"use client"

import { useMemo } from "react"

import { useMediaDetails } from "@/features/media-library/hooks/use-media-detail"
import {
  getMediaPreviewThumbnailUrl,
  getMediaWaveformAssetUrl,
  parseMediaPreviewSpriteSheets,
} from "@/features/media-library/lib/media-previews"
import { TimelineRuler } from "@/features/studio-editor/timeline/components/ruler"
import { TimelineToolbar } from "@/features/studio-editor/timeline/components/toolbar"
import { TimelineTrackLabels } from "@/features/studio-editor/timeline/components/track-labels"
import { TimelineTrackList } from "@/features/studio-editor/timeline/components/track-list"
import { useEditorRouteParams } from "@/features/studio-editor/hooks/use-editor-route-params"
import {
  useStudioPlaybackState,
  useStudioProjectState,
  useStudioSelectionState,
  useStudioTimelineActions,
  useStudioToolState,
} from "@/features/studio-editor/store/studio-editor-store"
import {
  TIMELINE_BASE_WIDTH,
  TIMELINE_GRID_LABEL_WIDTH,
  TIMELINE_ZOOM_MAX,
  TIMELINE_ZOOM_MIN,
} from "@/features/studio-editor/timeline/constants"
import { getProjectTimelineDuration } from "@/features/studio-editor/timeline/lib/layout"
import {
  buildRulerTicks,
  getTimelineMajorStep,
  getTimelineMinorStep,
  getTimelineZoomFromSliderValue,
  getTimelineZoomSliderValue,
} from "@/features/studio-editor/timeline/lib/time"
import { useAudioPeaks } from "@/features/studio-editor/timeline/hooks/use-audio-peaks"
import { useTimelineInteractions } from "@/features/studio-editor/timeline/hooks/use-timeline-interactions"
import { cn } from "@/lib/utils"

export {
  TIMELINE_COLLAPSED_HEIGHT,
  TIMELINE_DEFAULT_HEIGHT,
  TIMELINE_MAX_HEIGHT,
  TIMELINE_MIN_HEIGHT,
} from "@/features/studio-editor/timeline/constants"

export function StudioTimeline({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean
  onToggleCollapse: () => void
}) {
  const {
    currentTime,
    isPlaying,
    mutedTrackIds,
    seekToTime,
    togglePlayback,
    toggleTrackMute,
  } = useStudioPlaybackState()
  const { workspaceId } = useEditorRouteParams()
  const { project } = useStudioProjectState()
  const { selectedItem, setSelectedItemId } = useStudioSelectionState()
  const { setActiveTool } = useStudioToolState()
  const {
    deleteTimelineSegment,
    duplicateTimelineSegment,
    moveTimelineSegmentWithPush,
    updateTimelineSegmentTiming,
  } = useStudioTimelineActions()
  const mediaDetailQueries = useMediaDetails(
    workspaceId,
    project.projectMedia.map((item) => item.id),
    {
      enabled: project.projectMedia.length > 0,
    }
  )
  const mediaPreviewById = useMemo(
    () =>
      Object.fromEntries(
        mediaDetailQueries.flatMap((query) => {
          const media = query.data?.media

          if (!media) {
            return []
          }

          return [
            [
              media.id,
              {
                thumbnailUrl: getMediaPreviewThumbnailUrl(media),
                spriteSheets: parseMediaPreviewSpriteSheets(media),
                waveformUrl: getMediaWaveformAssetUrl(media),
              },
            ],
          ]
        })
      ),
    [mediaDetailQueries]
  )
  const projectMedia = useMemo(
    () =>
      project.projectMedia.map((item) => ({
        ...item,
        thumbnailUrl:
          item.thumbnailUrl ?? mediaPreviewById[item.id]?.thumbnailUrl ?? null,
      })),
    [mediaPreviewById, project.projectMedia]
  )
  const sourceMediaItem = useMemo(
    () =>
      projectMedia.find(
        (item) =>
          item.linkedSelectionId === project.sourceMedia.id ||
          item.origin === "SOURCE"
      ) ?? null,
    [project.sourceMedia.id, projectMedia]
  )
  const guideAudioItem = useMemo(
    () => projectMedia.find((item) => item.linkedSelectionId === "audio-bed") ?? null,
    [projectMedia]
  )
  const sourceMediaPreview = sourceMediaItem
    ? mediaPreviewById[sourceMediaItem.id] ?? null
    : null
  const guideAudioPreview = guideAudioItem
    ? mediaPreviewById[guideAudioItem.id] ?? null
    : null
  const timelineDurationSeconds = useMemo(
    () => getProjectTimelineDuration(project),
    [project]
  )
  const {
    applyZoomLevel,
    didResizeSegmentRef,
    downloadTimelineSegment,
    draggingSegmentId,
    handleSegmentDragPointerDown,
    handleSegmentResizePointerDown,
    handleTimelinePointerDown,
    isPanningTimeline,
    selectTimelineSegment,
    segmentDragPreview,
    timelineSurfaceRef,
    timelineViewportRef,
    updateZoom,
    zoomLevel,
  } = useTimelineInteractions({
    project,
    seekToTime,
    setActiveTool,
    setSelectedItemId,
    timelineDurationSeconds,
    moveTimelineSegmentWithPush,
    updateTimelineSegmentTiming,
  })
  const sourceAudioPeaks = useAudioPeaks(sourceMediaPreview?.waveformUrl)
  const guideAudioPeaks = useAudioPeaks(guideAudioPreview?.waveformUrl)
  const zoomPercent = getTimelineZoomSliderValue(zoomLevel)
  const timelineScaleDuration = Math.max(1, project.media.durationSeconds)
  const timelineContentWidth = Math.round(
    TIMELINE_BASE_WIDTH *
      zoomLevel *
      Math.max(1, timelineDurationSeconds / timelineScaleDuration)
  )
  const timelineGridWidth = timelineContentWidth + TIMELINE_GRID_LABEL_WIDTH
  const majorStep = getTimelineMajorStep(
    timelineDurationSeconds,
    timelineContentWidth
  )
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

  return (
    <footer className="flex h-full min-h-0 flex-col border-t border-border bg-surface-raised text-foreground">
      <div className="flex min-h-0 flex-1 flex-col">
        <TimelineToolbar
          currentTime={currentTime}
          isCollapsed={isCollapsed}
          isPlaying={isPlaying}
          onSeekForward={() => seekToTime(currentTime + 5)}
          onSeekRewind={() => seekToTime(currentTime - 5)}
          onToggleCollapse={onToggleCollapse}
          onTogglePlayback={togglePlayback}
          onZoomIn={() => updateZoom("in")}
          onZoomOut={() => updateZoom("out")}
          onZoomSliderChange={(sliderValue) =>
            applyZoomLevel(getTimelineZoomFromSliderValue(sliderValue))
          }
          timelineDurationSeconds={timelineDurationSeconds}
          zoomInDisabled={zoomInDisabled}
          zoomOutDisabled={zoomOutDisabled}
          zoomPercent={zoomPercent}
        />

        {isCollapsed ? null : (
          <div
            ref={timelineViewportRef}
            className="relative min-h-0 flex-1 overflow-auto px-4 py-3"
          >
            <div
              className="grid w-full min-w-[980px] grid-cols-[72px_minmax(0,1fr)] pb-1"
              style={{ minWidth: `${timelineGridWidth}px` }}
            >
              <TimelineTrackLabels
                mutedTrackIds={mutedTrackIds}
                onToggleTrackMute={toggleTrackMute}
                tracks={project.timelineTracks}
              />

              <div
                ref={timelineSurfaceRef}
                className={cn(
                  "relative min-w-0 select-none bg-surface-raised",
                  isPanningTimeline ? "cursor-grabbing" : "cursor-grab"
                )}
                onPointerDown={handleTimelinePointerDown}
              >
                <TimelineRuler
                  currentTime={currentTime}
                  majorTicks={majorTicks}
                  minorTicks={minorTicks}
                  playheadPercent={playheadPercent}
                  timelineDurationSeconds={timelineDurationSeconds}
                />
                <TimelineTrackList
                  didResizeSegmentRef={didResizeSegmentRef}
                  guideAudioItem={guideAudioItem}
                  guideAudioPeaks={guideAudioPeaks}
                  onDeleteSegment={deleteTimelineSegment}
                  onDownloadSegment={downloadTimelineSegment}
                  onDuplicateSegment={duplicateTimelineSegment}
                  onSegmentDragStart={handleSegmentDragPointerDown}
                  onSegmentClick={selectTimelineSegment}
                  onSegmentContextMenu={selectTimelineSegment}
                  onSegmentResizeStart={handleSegmentResizePointerDown}
                  mediaPreviewById={mediaPreviewById}
                  project={project}
                  selectedItem={selectedItem}
                  draggingSegmentId={draggingSegmentId}
                  segmentDragPreview={segmentDragPreview}
                  sourceAudioPeaks={sourceAudioPeaks}
                  sourceMediaItem={sourceMediaItem}
                  timelineContentWidth={timelineContentWidth}
                  timelineDurationSeconds={timelineDurationSeconds}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </footer>
  )
}
