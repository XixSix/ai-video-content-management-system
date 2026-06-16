"use client"

import type { MouseEvent as ReactMouseEvent } from "react"

import type {
  StudioEditorProject,
  StudioProjectMediaItem,
  StudioTimelineSegment,
  StudioTimelineTrack,
  StudioToolId,
} from "../../studio.types"
import { getSelectionToolId } from "../lib/display"

export function useSegmentActions({
  project,
  seekToTimelineClientX,
  setActiveTool,
  setSelectedItemId,
}: {
  project: StudioEditorProject
  seekToTimelineClientX: (clientX: number) => void
  setActiveTool: (toolId: StudioToolId) => void
  setSelectedItemId: (selectionId: string) => void
}) {
  const selectTimelineSegment = (
    event: ReactMouseEvent<HTMLButtonElement>,
    track: StudioTimelineTrack,
    segment: StudioTimelineSegment
  ) => {
    setActiveTool(getSelectionToolId(track.id, segment.selectionId))
    setSelectedItemId(segment.id)
    seekToTimelineClientX(event.clientX)
  }

  const downloadTimelineSegment = ({
    media,
    segment,
    trackId,
  }: {
    media: StudioProjectMediaItem | null
    segment: StudioTimelineSegment
    trackId: string
  }) => {
    const mediaUrl =
      media?.assetUrl ??
      (segment.selectionId === project.sourceMedia.id
        ? project.media.streamUrl
        : null)
    const filename = media?.name ?? `${segment.label}.txt`

    if (mediaUrl) {
      const downloadLink = document.createElement("a")
      downloadLink.href = mediaUrl
      downloadLink.download = filename
      document.body.append(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      return
    }

    const segmentFile = new Blob(
      [
        [
          `Segment: ${segment.label}`,
          `Track: ${trackId}`,
          `Start: ${segment.startTime ?? 0}s`,
          segment.summary,
        ].join("\n"),
      ],
      { type: "text/plain;charset=utf-8" }
    )
    const objectUrl = URL.createObjectURL(segmentFile)
    const downloadLink = document.createElement("a")

    downloadLink.href = objectUrl
    downloadLink.download = filename
    document.body.append(downloadLink)
    downloadLink.click()
    downloadLink.remove()
    URL.revokeObjectURL(objectUrl)
  }

  return {
    downloadTimelineSegment,
    selectTimelineSegment,
  }
}
