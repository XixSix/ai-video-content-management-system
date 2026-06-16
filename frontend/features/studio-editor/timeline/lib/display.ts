import type {
  StudioEditorProject,
  StudioTimelineSegment,
  StudioTimelineTrack,
} from "../../studio.types"

export function getTrackToolId(trackId: StudioTimelineTrack["id"]) {
  if (trackId === "AUDIO") {
    return "audio"
  }

  if (trackId === "TEXT") {
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

  if (selectionId === "audio-bed") {
    return "audio"
  }

  return getTrackToolId(trackId)
}

export function getTimelineSegmentDisplayText({
  segment,
  project,
}: {
  project: StudioEditorProject
  segment: StudioTimelineSegment
}) {
  if (segment.content) {
    return segment.content
  }

  const linkedLayer = project.layers.find((layer) => layer.id === segment.selectionId)

  if (linkedLayer?.kind === "text") {
    return linkedLayer.content ?? linkedLayer.label
  }

  return segment.label
}

export function isTextTimelineSegment(
  project: StudioEditorProject,
  segment: StudioTimelineSegment
) {
  const linkedLayer = project.layers.find((layer) => layer.id === segment.selectionId)

  return linkedLayer?.kind === "text"
}
