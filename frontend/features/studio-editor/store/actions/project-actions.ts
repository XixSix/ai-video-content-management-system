"use client"

import { recordEditorHistory } from "./history-actions"
import type {
  StudioAspectRatio,
  StudioEditorProject,
  StudioProjectMediaItem,
  StudioTimelineSegment,
  StudioTimelineTrack,
} from "../../studio.types"
import {
  getTimelineSegmentEndTime,
  getTimelineSegmentMedia,
  getTimelineSegmentStartTime,
} from "../../timeline/lib/layout"
import { getTimelineWidthClassName } from "../../timeline/lib/operations"
import type {
  StudioEditorGet,
  StudioEditorSet,
} from "../studio-editor-store.types"

function getTimelineTrackIdForMedia(media: StudioProjectMediaItem) {
  if (media.type === "VIDEO") {
    return "video"
  }

  if (media.type === "AUDIO") {
    return "audio"
  }

  if (media.type === "IMAGE") {
    return "overlays"
  }

  return null
}

function getMediaTimelineSelectionId(media: StudioProjectMediaItem) {
  return media.linkedSelectionId ?? media.id
}

function getNextAvailableTimelineStart({
  durationSeconds,
  project,
  startTime,
  track,
}: {
  durationSeconds: number
  project: StudioEditorProject
  startTime: number
  track: StudioTimelineTrack
}) {
  let nextStartTime = Math.max(0, startTime)
  const occupiedRanges = track.segments
    .map((segment) => {
      const segmentMedia = getTimelineSegmentMedia({ project, segment })

      return {
        endTime: getTimelineSegmentEndTime({
          media: segmentMedia,
          projectDurationSeconds: project.media.durationSeconds,
          segment,
        }),
        startTime: getTimelineSegmentStartTime({
          media: segmentMedia,
          segment,
        }),
      }
    })
    .sort((left, right) => left.startTime - right.startTime)

  for (const range of occupiedRanges) {
    const nextEndTime = nextStartTime + durationSeconds
    const fitsBeforeRange = nextEndTime <= range.startTime
    const overlapsRange =
      nextStartTime < range.endTime && nextEndTime > range.startTime

    if (fitsBeforeRange) {
      return nextStartTime
    }

    if (overlapsRange) {
      nextStartTime = range.endTime
    }
  }

  return nextStartTime
}

function createMediaTimelineSegment({
  durationSeconds,
  media,
  startTime,
}: {
  durationSeconds: number
  media: StudioProjectMediaItem
  startTime: number
}): StudioTimelineSegment {
  const segmentDurationSeconds = Math.max(0.25, media.durationSeconds ?? 8)

  return {
    id: `segment-${media.id}-${Date.now()}`,
    label: media.name,
    durationSeconds: segmentDurationSeconds,
    startTime,
    selectionId: media.id,
    summary: media.summary,
    tone: media.type === "AUDIO" ? "base" : "muted",
    widthClassName: getTimelineWidthClassName(
      segmentDurationSeconds,
      durationSeconds
    ),
  }
}

export function createProjectActions(
  set: StudioEditorSet,
  get: StudioEditorGet
) {
  return {
    addProjectMediaToTimeline: (mediaId: string) => {
      const { currentTime, project } = get()
      const media = project.projectMedia.find((item) => item.id === mediaId)
      const trackId = media ? getTimelineTrackIdForMedia(media) : null
      const targetTrack = project.timelineTracks.find((track) => track.id === trackId)

      if (!media || !trackId || !targetTrack) {
        return
      }

      recordEditorHistory(set, get)

      const segmentDurationSeconds = Math.max(0.25, media.durationSeconds ?? 8)
      const nextSegment = createMediaTimelineSegment({
        durationSeconds: project.media.durationSeconds,
        media,
        startTime: getNextAvailableTimelineStart({
          durationSeconds: segmentDurationSeconds,
          project,
          startTime: currentTime,
          track: targetTrack,
        }),
      })

      set((state) => ({
        project: {
          ...state.project,
          timelineTracks: state.project.timelineTracks.map((track) =>
            track.id === trackId
              ? {
                  ...track,
                  segments: [...track.segments, nextSegment],
                }
              : track
          ),
        },
        selectedItemId: nextSegment.id,
      }))
    },
    removeProjectMedia: (mediaId: string) => {
      const { project, selectedItemId } = get()
      const media = project.projectMedia.find((item) => item.id === mediaId)

      if (!media || media.origin === "SOURCE") {
        return
      }

      const timelineSelectionId = getMediaTimelineSelectionId(media)

      recordEditorHistory(set, get)

      set((state) => ({
        project: {
          ...state.project,
          projectMedia: state.project.projectMedia.filter(
            (item) => item.id !== mediaId
          ),
          timelineTracks: state.project.timelineTracks.map((track) => ({
            ...track,
            segments: track.segments.filter(
              (segment) =>
                segment.selectionId !== media.id &&
                segment.selectionId !== timelineSelectionId
            ),
          })),
        },
        selectedItemId:
          selectedItemId === media.id || selectedItemId === timelineSelectionId
            ? project.sourceMedia.id
            : selectedItemId,
      }))
    },
    updateProjectAspectRatio: (aspectRatio: StudioAspectRatio) => {
      if (get().project.media.aspectRatio === aspectRatio) {
        return
      }

      recordEditorHistory(set, get)

      set((state) => ({
        project: {
          ...state.project,
          media: {
            ...state.project.media,
            aspectRatio,
          },
        },
      }))
    },
    upsertProjectMedia: (media: StudioProjectMediaItem) => {
      recordEditorHistory(set, get)

      set((state) => {
        const existingMedia = state.project.projectMedia.some(
          (item) => item.id === media.id
        )

        return {
          activeTool: "media",
          project: {
            ...state.project,
            projectMedia: existingMedia
              ? state.project.projectMedia.map((item) =>
                  item.id === media.id ? { ...item, ...media } : item
                )
              : [...state.project.projectMedia, media],
          },
          selectedItemId: media.id,
        }
      })
    },
  }
}
