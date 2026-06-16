"use client"

import {
  getDuplicatedTimelineSegment,
  updateTimelineSegmentTimingInProject,
} from "../../timeline/lib/operations"
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
        sourceTrack,
      })
      const sourceSegmentIndex = sourceTrack.segments.findIndex(
        (segment) => segment.id === segmentId
      )

      set((state) => ({
        project: {
          ...state.project,
          timelineTracks: state.project.timelineTracks.map((track) =>
            track.id === sourceTrack.id
              ? {
                  ...track,
                  segments: [
                    ...track.segments.slice(0, sourceSegmentIndex + 1),
                    duplicatedSegment.segment,
                    ...track.segments.slice(sourceSegmentIndex + 1),
                  ],
                }
              : track
          ),
        },
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
  }
}
