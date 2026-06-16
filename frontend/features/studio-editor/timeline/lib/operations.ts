import type {
  StudioEditorProject,
  StudioTimelineSegment,
  StudioTimelineTrack,
  StudioTimelineTrackId,
} from "../../studio.types"
import {
  getTimelineSegmentDuration,
  getTimelineSegmentEndTime,
  getTimelineSegmentMedia,
  getTimelineSegmentStartTime,
} from "./layout"

export const STRICT_TIMELINE_TRACK_ORDER: StudioTimelineTrackId[] = [
  "TEXT",
  "OVERLAY_MEDIA",
  "SOURCE",
  "AUDIO",
]

export function getTimelineWidthClassName(
  durationSeconds: number,
  projectDurationSeconds: number
) {
  const widthPercent =
    projectDurationSeconds > 0 ? (durationSeconds / projectDurationSeconds) * 100 : 0

  return `w-[${Number(widthPercent.toFixed(2))}%]`
}

export function updateTimelineSegmentTimingInProject({
  project,
  segmentId,
  timing,
}: {
  project: StudioEditorProject
  segmentId: string
  timing: {
    durationSeconds: number
    startTime: number
  }
}) {
  const durationSeconds = Math.max(0.25, timing.durationSeconds)

  return {
    ...project,
    timelineTracks: project.timelineTracks.map((track) => ({
      ...track,
      segments: track.segments.map((segment) =>
        segment.id === segmentId
          ? {
              ...segment,
              durationSeconds,
              startTime: Math.max(0, timing.startTime),
              widthClassName: getTimelineWidthClassName(
                durationSeconds,
                project.media.durationSeconds
              ),
            }
          : segment
      ),
    })),
  }
}

export function getSegmentRange({
  project,
  segment,
}: {
  project: StudioEditorProject
  segment: StudioTimelineSegment
}) {
  const media = getTimelineSegmentMedia({ project, segment })
  const startTime = getTimelineSegmentStartTime({ media, segment })
  const durationSeconds = getTimelineSegmentDuration({
    media,
    projectDurationSeconds: project.media.durationSeconds,
    segment,
  })

  return {
    durationSeconds,
    endTime: startTime + durationSeconds,
    startTime,
  }
}

function withTimelineSegmentTiming({
  durationSeconds,
  projectDurationSeconds,
  segment,
  startTime,
}: {
  durationSeconds: number
  projectDurationSeconds: number
  segment: StudioTimelineSegment
  startTime: number
}): StudioTimelineSegment {
  return {
    ...segment,
    durationSeconds,
    laneIndex: undefined,
    offsetClassName: undefined,
    startTime: Math.max(0, startTime),
    widthClassName: getTimelineWidthClassName(
      durationSeconds,
      projectDurationSeconds
    ),
  }
}

function pushTrackSegmentsForInsert({
  insertedSegment,
  project,
  track,
}: {
  insertedSegment: StudioTimelineSegment
  project: StudioEditorProject
  track: StudioTimelineTrack
}) {
  const insertedRange = getSegmentRange({ project, segment: insertedSegment })
  let cursorEndTime = insertedRange.endTime
  const shiftedSegments = track.segments
    .map((segment) => {
      const range = getSegmentRange({ project, segment })

      return {
        range,
        segment,
      }
    })
    .sort((left, right) => left.range.startTime - right.range.startTime)
    .map(({ range, segment }) => {
      if (range.endTime <= insertedRange.startTime) {
        return segment
      }

      if (range.startTime >= cursorEndTime) {
        return segment
      }

      const shiftedSegment = withTimelineSegmentTiming({
        durationSeconds: range.durationSeconds,
        projectDurationSeconds: project.media.durationSeconds,
        segment,
        startTime: cursorEndTime,
      })

      cursorEndTime += range.durationSeconds

      return shiftedSegment
    })

  return [...shiftedSegments, insertedSegment].sort((left, right) => {
    const leftRange = getSegmentRange({ project, segment: left })
    const rightRange = getSegmentRange({ project, segment: right })

    return leftRange.startTime - rightRange.startTime
  })
}

export function insertSegmentWithPush({
  project,
  segment,
  trackId,
}: {
  project: StudioEditorProject
  segment: StudioTimelineSegment
  trackId: StudioTimelineTrackId
}) {
  return {
    ...project,
    timelineTracks: project.timelineTracks.map((track) =>
      track.id === trackId
        ? {
            ...track,
            segments: pushTrackSegmentsForInsert({
              insertedSegment: segment,
              project,
              track,
            }),
          }
        : track
    ),
  }
}

export function moveSegmentWithinTrackWithPush({
  project,
  segmentId,
  startTime,
}: {
  project: StudioEditorProject
  segmentId: string
  startTime: number
}) {
  const sourceTrack = project.timelineTracks.find((track) =>
    track.segments.some((segment) => segment.id === segmentId)
  )
  const sourceSegment = sourceTrack?.segments.find(
    (segment) => segment.id === segmentId
  )

  if (!sourceTrack || !sourceSegment || sourceTrack.id === "SOURCE") {
    return project
  }

  const sourceRange = getSegmentRange({ project, segment: sourceSegment })
  const movedSegment = withTimelineSegmentTiming({
    durationSeconds: sourceRange.durationSeconds,
    projectDurationSeconds: project.media.durationSeconds,
    segment: sourceSegment,
    startTime,
  })
  const trackWithoutMovedSegment = {
    ...sourceTrack,
    segments: sourceTrack.segments.filter((segment) => segment.id !== segmentId),
  }
  const movedTrackSegments = pushTrackSegmentsForInsert({
    insertedSegment: movedSegment,
    project,
    track: trackWithoutMovedSegment,
  })

  return {
    ...project,
    timelineTracks: project.timelineTracks.map((track) =>
      track.id === sourceTrack.id
        ? {
            ...track,
            segments: movedTrackSegments,
          }
        : track
    ),
  }
}

export function getSmartTimelineInsertStartTime({
  durationSeconds,
  preferredStartTime,
  project,
  trackId,
}: {
  durationSeconds: number
  preferredStartTime: number
  project: StudioEditorProject
  trackId: StudioTimelineTrackId
}) {
  const track = project.timelineTracks.find(
    (timelineTrack) => timelineTrack.id === trackId
  )
  const clampedPreferredStartTime = Math.max(0, preferredStartTime)

  if (!track) {
    return clampedPreferredStartTime
  }

  const insertionEndTime = clampedPreferredStartTime + Math.max(0, durationSeconds)
  const trackRanges = track.segments
    .map((segment) => getSegmentRange({ project, segment }))
    .sort((left, right) => left.startTime - right.startTime)
  const touchedSegment = trackRanges.find(
    (range) =>
      clampedPreferredStartTime >= range.startTime &&
      clampedPreferredStartTime <= range.endTime
  )

  if (touchedSegment) {
    return touchedSegment.endTime
  }

  const overlappingSegment = trackRanges.find(
    (range) =>
      clampedPreferredStartTime < range.endTime &&
      insertionEndTime > range.startTime
  )

  return overlappingSegment?.endTime ?? clampedPreferredStartTime
}

export function getDuplicatedTimelineSegment({
  project,
  sourceSegment,
}: {
  project: StudioEditorProject
  sourceSegment: StudioTimelineSegment
}) {
  const sourceMedia = getTimelineSegmentMedia({
    project,
    segment: sourceSegment,
  })
  const estimatedSegmentDuration = Math.max(
    0.25,
    getTimelineSegmentDuration({
      media: sourceMedia,
      projectDurationSeconds: project.media.durationSeconds,
      segment: sourceSegment,
    })
  )
  const sourceEndTime = getTimelineSegmentEndTime({
    media: sourceMedia,
    projectDurationSeconds: project.media.durationSeconds,
    segment: sourceSegment,
  })
  const nextSegmentId = `${sourceSegment.id}-copy-${Date.now()}`
  const sourceLabel = sourceSegment.label.replace(/(?: copy)+$/i, "")

  return {
    id: nextSegmentId,
    segment: withTimelineSegmentTiming({
      durationSeconds: estimatedSegmentDuration,
      projectDurationSeconds: project.media.durationSeconds,
      segment: {
        ...sourceSegment,
        id: nextSegmentId,
        label: `${sourceLabel} copy`,
      },
      startTime: Math.max(0, sourceEndTime),
    }),
  }
}
