import type {
  StudioCanvasLayer,
  StudioEditorProject,
  StudioProjectMediaItem,
  StudioTimelineSegment,
  StudioTimelineTrackId,
} from "../../studio.types"
import {
  getTimelineSegmentDuration,
  getTimelineSegmentMedia,
  getTimelineSegmentStartTime,
} from "../../timeline/lib/layout"

export type ActiveCompositionSegment = {
  localTime: number
  media: StudioProjectMediaItem | null
  segment: StudioTimelineSegment
  trackId: StudioTimelineTrackId
}

export type StudioCompositionFrame = {
  audio: ActiveCompositionSegment[]
  overlays: ActiveCompositionSegment[]
  source: ActiveCompositionSegment | null
  visibleLayerIds: Set<string>
}

export function isTimelineSegmentActive({
  currentTime,
  media,
  projectDurationSeconds,
  segment,
}: {
  currentTime: number
  media: StudioProjectMediaItem | null
  projectDurationSeconds: number
  segment: StudioTimelineSegment
}) {
  const startTime = getTimelineSegmentStartTime({ media, segment })
  const durationSeconds = getTimelineSegmentDuration({
    media,
    projectDurationSeconds,
    segment,
  })

  return currentTime >= startTime && currentTime < startTime + durationSeconds
}

export function getTimelineSegmentLocalTime({
  currentTime,
  media,
  segment,
}: {
  currentTime: number
  media: StudioProjectMediaItem | null
  segment: StudioTimelineSegment
}) {
  return Math.max(
    0,
    currentTime - getTimelineSegmentStartTime({ media, segment })
  )
}

function getActiveTrackSegments(
  project: StudioEditorProject,
  currentTime: number,
  trackId: StudioTimelineTrackId
): ActiveCompositionSegment[] {
  const track = project.timelineTracks.find((item) => item.id === trackId)

  return (track?.segments ?? []).flatMap((segment) => {
    const media = getTimelineSegmentMedia({ project, segment })

    if (
      !isTimelineSegmentActive({
        currentTime,
        media,
        projectDurationSeconds: project.media.durationSeconds,
        segment,
      })
    ) {
      return []
    }

    return [
      {
        localTime: getTimelineSegmentLocalTime({
          currentTime,
          media,
          segment,
        }),
        media,
        segment,
        trackId,
      },
    ]
  })
}

export function isCanvasLayerVisibleAtTime({
  currentTime,
  layer,
  project,
}: {
  currentTime: number
  layer: StudioCanvasLayer
  project: StudioEditorProject
}) {
  const referencingSegments = project.timelineTracks.flatMap((track) =>
    track.segments.filter((segment) => segment.selectionId === layer.id)
  )

  if (referencingSegments.length === 0) {
    return true
  }

  return referencingSegments.some((segment) =>
    isTimelineSegmentActive({
      currentTime,
      media: null,
      projectDurationSeconds: project.media.durationSeconds,
      segment,
    })
  )
}

export function resolveCompositionFrame(
  project: StudioEditorProject,
  currentTime: number
): StudioCompositionFrame {
  const sourceSegments = getActiveTrackSegments(
    project,
    currentTime,
    "SOURCE"
  )

  return {
    source: sourceSegments[0] ?? null,
    overlays: getActiveTrackSegments(project, currentTime, "OVERLAY_MEDIA"),
    audio: getActiveTrackSegments(project, currentTime, "AUDIO"),
    visibleLayerIds: new Set(
      project.layers
        .filter((layer) =>
          isCanvasLayerVisibleAtTime({ currentTime, layer, project })
        )
        .map((layer) => layer.id)
    ),
  }
}
