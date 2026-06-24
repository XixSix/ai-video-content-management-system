"use client"

import {
  getDuplicatedTimelineSegment,
  insertSegmentWithPush,
  moveSegmentWithinTrackWithPush,
  updateTimelineSegmentTimingInProject,
} from "../../timeline/lib/operations"
import type { StudioEditorProject } from "../../studio.types"
import {
  getOverlaySegmentCanvasGeometry,
  type StudioCanvasGeometry,
} from "../../canvas/lib/geometry"
import { recordEditorHistory } from "./history-actions"
import type {
  StudioEditorGet,
  StudioEditorSet,
} from "../studio-editor-store.types"

export function createTimelineActions(
  set: StudioEditorSet,
  get: StudioEditorGet
) {
  return {
    deleteTimelineSegment: (segmentId: string) => {
      const { project, selectedItemId } = get()
      const track = project.timelineTracks.find((track) =>
        track.segments.some((segment) => segment.id === segmentId)
      )

      if (!track) {
        return
      }

      recordEditorHistory(set, get)

      set((state) => ({
        project: {
          ...state.project,
          timelineTracks: state.project.timelineTracks.map((track) => ({
            ...track,
            segments: track.segments.filter((segment) => segment.id !== segmentId),
          })),
        },
        selectedItemId:
          selectedItemId === segmentId ? project.sourceMedia.id : state.selectedItemId,
      }))
    },
    duplicateTimelineSegment: (segmentId: string) => {
      const { project } = get()
      const sourceTrack = project.timelineTracks.find((track) =>
        track.segments.some((segment) => segment.id === segmentId)
      )
      const sourceSegment = sourceTrack?.segments.find(
        (segment) => segment.id === segmentId
      )

      if (!sourceTrack || !sourceSegment) {
        return
      }

      recordEditorHistory(set, get)

      const duplicatedSegment = getDuplicatedTimelineSegment({
        project,
        sourceSegment,
      })
      set((state) => ({
        project: insertSegmentWithPush({
          project: state.project,
          segment: duplicatedSegment.segment,
          trackId: sourceTrack.id,
        }),
        selectedItemId: duplicatedSegment.id,
      }))
    },
    updateTimelineSegmentTiming: (
      segmentId: string,
      timing: {
        durationSeconds: number
        startTime: number
      }
    ) => {
      set((state) => ({
        project: updateTimelineSegmentTimingInProject({
          project: state.project,
          segmentId,
          timing,
        }),
      }))
    },
    updateTimelineSegmentGeometry: (
      segmentId: string,
      geometry: StudioCanvasGeometry,
      options?: {
        recordHistory?: boolean
      }
    ) => {
      const { project } = get()
      const sourceTrack = project.timelineTracks.find((track) =>
        track.segments.some((segment) => segment.id === segmentId)
      )
      const sourceSegment = sourceTrack?.segments.find(
        (segment) => segment.id === segmentId
      )

      if (!sourceTrack || sourceTrack.id !== "OVERLAY_MEDIA" || !sourceSegment) {
        return
      }

      const currentGeometry = getOverlaySegmentCanvasGeometry(sourceSegment)

      if (
        currentGeometry.xPercent === geometry.xPercent &&
        currentGeometry.yPercent === geometry.yPercent &&
        currentGeometry.widthPercent === geometry.widthPercent &&
        currentGeometry.heightPercent === geometry.heightPercent
      ) {
        return
      }

      if (options?.recordHistory) {
        recordEditorHistory(set, get)
      }

      set((state) => ({
        project: {
          ...state.project,
          timelineTracks: state.project.timelineTracks.map((track) =>
            track.id === "OVERLAY_MEDIA"
              ? {
                  ...track,
                  segments: track.segments.map((segment) =>
                    segment.id === segmentId ? { ...segment, ...geometry } : segment
                  ),
                }
              : track
          ),
        },
        selectedItemId: segmentId,
      }))
    },
    moveTimelineSegmentWithPush: (
      segmentId: string,
      startTime: number,
      options?: {
        baseProject?: StudioEditorProject
        recordHistory?: boolean
      }
    ) => {
      const project = options?.baseProject ?? get().project
      const sourceTrack = project.timelineTracks.find((track) =>
        track.segments.some((segment) => segment.id === segmentId)
      )

      if (!sourceTrack || sourceTrack.id === "SOURCE") {
        return
      }

      if (options?.recordHistory) {
        recordEditorHistory(set, get)
      }

      set((state) => ({
        project: moveSegmentWithinTrackWithPush({
          project: options?.baseProject ?? state.project,
          segmentId,
          startTime,
        }),
        selectedItemId: segmentId,
      }))
    },
  }
}
