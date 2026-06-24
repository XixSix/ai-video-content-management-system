"use client"

import { recordEditorHistory } from "./history-actions"
import type {
  StudioAspectRatio,
  StudioProjectMediaItem,
  StudioTimelineSegment,
  StudioTimelineTrackId,
} from "../../studio.types"
import {
  getSmartTimelineInsertStartTime,
  getTimelineWidthClassName,
  insertSegmentWithPush,
} from "../../timeline/lib/operations"
import { getDefaultCanvasGeometry } from "../../canvas/lib/geometry"
import type {
  StudioEditorGet,
  StudioEditorSet,
} from "../studio-editor-store.types"

function getTimelineTrackIdForMedia(
  media: StudioProjectMediaItem
): StudioTimelineTrackId | null {
  if (media.type === "AUDIO") {
    return "AUDIO"
  }

  if (media.type === "IMAGE" || media.type === "VIDEO") {
    return "OVERLAY_MEDIA"
  }

  return null
}

function getMediaTimelineSelectionId(media: StudioProjectMediaItem) {
  return media.linkedSelectionId ?? media.id
}

function getMediaTimelineSegmentDuration(media: StudioProjectMediaItem) {
  if (media.type === "IMAGE") {
    return 8
  }

  return Math.max(0.25, media.durationSeconds ?? 0)
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
  const segmentDurationSeconds = getMediaTimelineSegmentDuration(media)

  return {
    id: `segment-${media.id}-${crypto.randomUUID()}`,
    label: media.name,
    durationSeconds: segmentDurationSeconds,
    startTime,
    selectionId: media.id,
    summary: media.summary,
    tone: media.type === "AUDIO" ? "base" : "muted",
    ...(media.type === "IMAGE" || media.type === "VIDEO"
      ? getDefaultCanvasGeometry("overlay")
      : {}),
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

      if (!media || !trackId) {
        return
      }

      recordEditorHistory(set, get)

      const segmentDurationSeconds = getMediaTimelineSegmentDuration(media)
      const nextSegment = createMediaTimelineSegment({
        durationSeconds: project.media.durationSeconds,
        media,
        startTime: getSmartTimelineInsertStartTime({
          durationSeconds: segmentDurationSeconds,
          preferredStartTime: currentTime,
          project,
          trackId,
        }),
      })

      set((state) => ({
        project: insertSegmentWithPush({
          project: state.project,
          segment: nextSegment,
          trackId,
        }),
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
    setProjectSource: (sourceProject: ReturnType<StudioEditorGet>["project"]) => {
      const sourceMedia = sourceProject.projectMedia.find(
        (item) => item.origin === "SOURCE"
      )

      if (!sourceMedia) {
        return
      }

      recordEditorHistory(set, get)

      set((state) => {
        const projectMedia = sourceProject.projectMedia.map((item) => {
          const existing = state.project.projectMedia.find(
            (current) => current.id === item.id
          )

          return existing
            ? {
                ...item,
                assetUrl: existing.assetUrl ?? item.assetUrl,
                thumbnailUrl: existing.thumbnailUrl ?? item.thumbnailUrl,
              }
            : item
        })
        const sourceTrack = {
          id: "SOURCE" as const,
          label: "Source",
          selectionId: sourceMedia.id,
          segments:
            sourceProject.media.durationSeconds > 0
              ? [
                  {
                    id: `source-${sourceMedia.id}`,
                    label: sourceMedia.name,
                    durationSeconds: sourceProject.media.durationSeconds,
                    startTime: 0,
                    selectionId: sourceMedia.id,
                    summary: sourceMedia.summary,
                    tone: "base" as const,
                    widthClassName: "w-[100%]",
                  },
                ]
              : [],
        }
        const hasSourceTrack = state.project.timelineTracks.some(
          (track) => track.id === "SOURCE"
        )

        return {
          activeTool: "media",
          currentTime: 0,
          isPlaying: false,
          project: {
            ...state.project,
            media: sourceProject.media,
            projectMedia,
            sourceMedia: sourceProject.sourceMedia,
            timelineTracks: hasSourceTrack
              ? state.project.timelineTracks.map((track) =>
                  track.id === "SOURCE" ? sourceTrack : track
                )
              : [...state.project.timelineTracks, sourceTrack],
          },
          selectedItemId: sourceMedia.id,
        }
      })
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
