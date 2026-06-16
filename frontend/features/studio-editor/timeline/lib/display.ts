import type {
  StudioEditorProject,
  StudioTimelineSegment,
  StudioTimelineTrack,
} from "../../studio.types"

export function getTrackToolId(trackId: StudioTimelineTrack["id"]) {
  if (trackId === "captions") {
    return "captions"
  }

  if (trackId === "audio") {
    return "audio"
  }

  if (trackId === "overlays") {
    return "text"
  }

  return "media"
}

export function getSelectionToolId(
  trackId: StudioTimelineTrack["id"],
  selectionId: string
) {
  if (selectionId === "brand-mark") {
    return "assets"
  }

  if (selectionId === "hook-copy") {
    return "text"
  }

  if (selectionId === "captions") {
    return "captions"
  }

  if (selectionId === "audio-bed") {
    return "audio"
  }

  return getTrackToolId(trackId)
}

export function getCaptionSegmentText({
  project,
  segment,
  segmentEndTime,
  segmentStartTime,
}: {
  project: StudioEditorProject
  segment: StudioTimelineSegment
  segmentEndTime: number
  segmentStartTime: number
}) {
  const overlappingSegments = project.transcriptSegments.filter(
    (transcriptSegment) =>
      transcriptSegment.startTime < segmentEndTime &&
      transcriptSegment.endTime > segmentStartTime
  )

  return (
    overlappingSegments.map((transcriptSegment) => transcriptSegment.text).join(" ") ||
    segment.label
  )
}

export function getTimelineSegmentDisplayText({
  project,
  segment,
  segmentEndTime,
  segmentStartTime,
}: {
  project: StudioEditorProject
  segment: StudioTimelineSegment
  segmentEndTime: number
  segmentStartTime: number
}) {
  if (segment.content) {
    return segment.content
  }

  const linkedLayer = project.layers.find((layer) => layer.id === segment.selectionId)

  if (linkedLayer?.kind === "text") {
    return linkedLayer.content ?? linkedLayer.label
  }

  if (linkedLayer?.kind === "captions") {
    return getCaptionSegmentText({
      project,
      segment,
      segmentEndTime,
      segmentStartTime,
    })
  }

  return segment.label
}

export function isTextTimelineSegment(
  project: StudioEditorProject,
  segment: StudioTimelineSegment
) {
  const linkedLayer = project.layers.find((layer) => layer.id === segment.selectionId)

  return linkedLayer?.kind === "text" || linkedLayer?.kind === "captions"
}
