import type {
  StudioEditorProject,
  StudioProjectMediaItem,
  StudioTimelineSegment,
  StudioTimelineTrack,
} from "../../studio.types"
import {
  TIMELINE_DEFAULT_LANE_HEIGHT,
  TIMELINE_VIDEO_LANE_HEIGHT,
} from "../constants"

export function getWidthPercentFromClassName(widthClassName: string) {
  const arbitraryWidthMatch = widthClassName.match(/w-\[(\d+(?:\.\d+)?)%\]/)

  if (!arbitraryWidthMatch) {
    return null
  }

  return Number(arbitraryWidthMatch[1])
}

export function getTimelineSegmentMedia({
  project,
  segment,
}: {
  project: StudioEditorProject
  segment: StudioTimelineSegment
}) {
  if (segment.selectionId === project.sourceMedia.id) {
    return (
      project.projectMedia.find(
        (item) =>
          item.linkedSelectionId === project.sourceMedia.id ||
          item.origin === "SOURCE"
      ) ?? null
    )
  }

  return (
    project.projectMedia.find(
      (item) =>
        item.id === segment.selectionId ||
        item.linkedSelectionId === segment.selectionId
    ) ?? null
  )
}

export function getTimelineSegmentDuration({
  media,
  projectDurationSeconds,
  segment,
}: {
  media: StudioProjectMediaItem | null
  projectDurationSeconds: number
  segment: StudioTimelineSegment
}) {
  const widthPercent = getWidthPercentFromClassName(segment.widthClassName)
  const widthDuration =
    widthPercent !== null ? (widthPercent / 100) * projectDurationSeconds : null

  return Math.max(
    0,
    segment.durationSeconds ??
      media?.durationSeconds ??
      widthDuration ??
      projectDurationSeconds
  )
}

export function getTimelineSegmentStartTime({
  media,
  segment,
}: {
  media: StudioProjectMediaItem | null
  segment: StudioTimelineSegment
}) {
  return Math.max(0, segment.startTime ?? media?.startTime ?? 0)
}

export function getTimelineSegmentEndTime({
  media,
  projectDurationSeconds,
  segment,
}: {
  media: StudioProjectMediaItem | null
  projectDurationSeconds: number
  segment: StudioTimelineSegment
}) {
  return (
    getTimelineSegmentStartTime({ media, segment }) +
    getTimelineSegmentDuration({
      media,
      projectDurationSeconds,
      segment,
    })
  )
}

export function getProjectTimelineDuration(project: StudioEditorProject) {
  const segmentEndTimes = project.timelineTracks.flatMap((track) =>
    track.segments.map((segment) => {
      const segmentMedia = getTimelineSegmentMedia({ project, segment })

      return getTimelineSegmentEndTime({
        media: segmentMedia,
        projectDurationSeconds: project.media.durationSeconds,
        segment,
      })
    })
  )

  return Math.max(project.media.durationSeconds, ...segmentEndTimes)
}

export function getTrackLaneCount() {
  return 1
}

export function getTrackLaneHeight(trackId: StudioTimelineTrack["id"]) {
  return trackId === "SOURCE"
    ? TIMELINE_VIDEO_LANE_HEIGHT
    : TIMELINE_DEFAULT_LANE_HEIGHT
}

export function getTrackContentHeight(track: StudioTimelineTrack) {
  return getTrackLaneCount() * getTrackLaneHeight(track.id)
}

export function getTimedSegmentStyle({
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
  const startTime = getTimelineSegmentStartTime({ media, segment })
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
