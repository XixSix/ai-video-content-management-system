import type {
  StudioEditorProject,
  StudioProjectMediaItem,
  StudioTimelineSegment,
  StudioTimelineTrack,
} from "../../studio.types"
import { TIMELINE_SEGMENT_MIN_DURATION } from "../constants"
import {
  getTimelineSegmentEndTime,
  getTimelineSegmentMedia,
  getTimelineSegmentStartTime,
} from "./layout"

export function getTimelineSegmentResizeBounds({
  media,
  project,
  segment,
  timelineDurationSeconds,
  trackId,
}: {
  media: StudioProjectMediaItem | null
  project: StudioEditorProject
  segment: StudioTimelineSegment
  timelineDurationSeconds: number
  trackId: StudioTimelineTrack["id"]
}) {
  const initialStartTime = getTimelineSegmentStartTime({ media, segment })
  const initialEndTime = getTimelineSegmentEndTime({
    media,
    projectDurationSeconds: project.media.durationSeconds,
    segment,
  })
  const track = project.timelineTracks.find(
    (timelineTrack) => timelineTrack.id === trackId
  )
  const trackSegments =
    track?.segments
      .map((trackSegment) => {
        const trackSegmentMedia = getTimelineSegmentMedia({
          project,
          segment: trackSegment,
        })
        const startTime = getTimelineSegmentStartTime({
          media: trackSegmentMedia,
          segment: trackSegment,
        })

        return {
          endTime: getTimelineSegmentEndTime({
            media: trackSegmentMedia,
            projectDurationSeconds: project.media.durationSeconds,
            segment: trackSegment,
          }),
          id: trackSegment.id,
          startTime,
        }
      })
      .sort((left, right) => left.startTime - right.startTime) ?? []
  const segmentIndex = trackSegments.findIndex(
    (trackSegment) => trackSegment.id === segment.id
  )
  const previousSegmentEndTime =
    segmentIndex > 0 ? trackSegments[segmentIndex - 1]?.endTime : undefined
  const nextSegmentStartTime =
    segmentIndex >= 0 ? trackSegments[segmentIndex + 1]?.startTime : undefined
  const maxStartTime = initialEndTime - TIMELINE_SEGMENT_MIN_DURATION
  const minStartTime =
    typeof previousSegmentEndTime === "number"
      ? Math.min(previousSegmentEndTime, maxStartTime)
      : 0
  const minEndTime = initialStartTime + TIMELINE_SEGMENT_MIN_DURATION
  const maxEndTime =
    typeof nextSegmentStartTime === "number"
      ? Math.max(minEndTime, nextSegmentStartTime)
      : timelineDurationSeconds

  return {
    initialEndTime,
    initialStartTime,
    maxEndTime,
    maxStartTime,
    minEndTime,
    minStartTime,
  }
}
