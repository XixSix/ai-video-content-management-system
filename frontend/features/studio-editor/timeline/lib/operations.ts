import type {
  StudioEditorProject,
  StudioTimelineSegment,
  StudioTimelineTrack,
} from "../../studio.types"
import {
  getTimelineSegmentDuration,
  getTimelineSegmentEndTime,
  getTimelineSegmentMedia,
  getTimelineSegmentStartTime,
} from "./layout"

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

export function getDuplicatedTimelineSegment({
  project,
  sourceSegment,
  sourceTrack,
}: {
  project: StudioEditorProject
  sourceSegment: StudioTimelineSegment
  sourceTrack: StudioTimelineTrack
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
  const occupiedSegments = sourceTrack.segments
    .filter((segment) => segment.id !== sourceSegment.id)
    .map((segment) => {
      const segmentMedia = getTimelineSegmentMedia({ project, segment })
      const startTime = getTimelineSegmentStartTime({
        media: segmentMedia,
        segment,
      })

      return {
        endTime: getTimelineSegmentEndTime({
          media: segmentMedia,
          projectDurationSeconds: project.media.durationSeconds,
          segment,
        }),
        laneIndex: segment.laneIndex ?? 0,
        startTime,
      }
    })
    .sort((left, right) => left.startTime - right.startTime)
  const nextStartTime = Math.max(0, sourceEndTime)
  const nextEndTime = nextStartTime + estimatedSegmentDuration
  let nextLaneIndex = sourceSegment.laneIndex ?? 0

  while (
    occupiedSegments.some(
      (occupiedSegment) =>
        occupiedSegment.laneIndex === nextLaneIndex &&
        nextStartTime < occupiedSegment.endTime &&
        nextEndTime > occupiedSegment.startTime
    )
  ) {
    nextLaneIndex += 1
  }

  const nextSegmentId = `${sourceSegment.id}-copy-${Date.now()}`
  const sourceLabel = sourceSegment.label.replace(/(?: copy)+$/i, "")

  return {
    id: nextSegmentId,
    segment: {
      ...sourceSegment,
      id: nextSegmentId,
      durationSeconds: estimatedSegmentDuration,
      laneIndex: nextLaneIndex,
      label: `${sourceLabel} copy`,
      offsetClassName:
        sourceTrack.id === "video" || sourceTrack.id === "audio"
          ? sourceSegment.offsetClassName
          : undefined,
      startTime: nextStartTime,
    },
  }
}
