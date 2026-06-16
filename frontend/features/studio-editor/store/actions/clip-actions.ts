"use client"

import type {
  StudioClipCandidateStatus,
  StudioShortClip,
} from "../../studio.types"
import { clampTime } from "../studio-editor-state"
import { recordEditorHistory } from "./history-actions"
import type {
  ClipCandidateDetailsUpdate,
  ShortClipDetailsUpdate,
  StudioEditorGet,
  StudioEditorSet,
} from "../studio-editor-store.types"

export function createClipActions(
  set: StudioEditorSet,
  get: StudioEditorGet
) {
  return {
    createDraftClipFromCandidate: (clipCandidateId: string) => {
      const { project } = get()
      const clipCandidate = project.clipCandidates.find(
        (item) => item.id === clipCandidateId
      )

      if (!clipCandidate) {
        return
      }

      const existingDraft = project.shortClips.find(
        (item) => item.sourceCandidateId === clipCandidateId
      )
      const nextClipId = existingDraft?.id ?? `short_clip_${Date.now()}`
      const nextDraft: StudioShortClip = {
        id: nextClipId,
        sourceCandidateId: clipCandidateId,
        title: clipCandidate.title,
        caption: clipCandidate.caption,
        startTime: clipCandidate.startTime,
        endTime: clipCandidate.endTime,
        duration: clipCandidate.duration,
        status: "DRAFT",
        videoPath: `short-clips/launch-keynote/${nextClipId}.mp4`,
        thumbnailPath: `short-clips/launch-keynote/${nextClipId}.jpg`,
        aspectRatio: clipCandidate.aspectRatio,
        platform: clipCandidate.platform,
        burnSubtitles: clipCandidate.burnSubtitles,
        transcriptVersion: project.transcript.version,
      }

      recordEditorHistory(set, get)

      set((state) => ({
        activeTool: "clips",
        currentTime: clipCandidate.startTime,
        project: {
          ...state.project,
          clipCandidates: state.project.clipCandidates.map((item) =>
            item.id === clipCandidateId ? { ...item, status: "SELECTED" } : item
          ),
          shortClips: existingDraft
            ? state.project.shortClips.map((item) =>
                item.id === existingDraft.id ? nextDraft : item
              )
            : [nextDraft, ...state.project.shortClips],
        },
        selectedChapterId: null,
        selectedClipCandidateId: null,
        selectedItemId: project.sourceMedia.id,
        selectedShortClipId: nextClipId,
        selectedTranscriptSegmentId: null,
      }))
    },
    setClipCandidateStatus: (
      clipCandidateId: string,
      status: StudioClipCandidateStatus
    ) => {
      const clipCandidate = get().project.clipCandidates.find(
        (item) => item.id === clipCandidateId
      )

      if (!clipCandidate || clipCandidate.status === status) {
        return
      }

      recordEditorHistory(set, get)

      set((state) => ({
        project: {
          ...state.project,
          clipCandidates: state.project.clipCandidates.map((item) =>
            item.id === clipCandidateId ? { ...item, status } : item
          ),
        },
      }))
    },
    updateClipCandidateDetails: (
      clipCandidateId: string,
      details: ClipCandidateDetailsUpdate
    ) => {
      const clipCandidate = get().project.clipCandidates.find(
        (item) => item.id === clipCandidateId
      )

      if (!clipCandidate) {
        return
      }

      const hasChanges = Object.entries(details).some(([key, value]) => {
        return clipCandidate[key as keyof typeof details] !== value
      })

      if (!hasChanges) {
        return
      }

      recordEditorHistory(set, get)

      set((state) => ({
        project: {
          ...state.project,
          clipCandidates: state.project.clipCandidates.map((item) =>
            item.id === clipCandidateId ? { ...item, ...details } : item
          ),
        },
      }))
    },
    updateClipCandidateTiming: (
      clipCandidateId: string,
      timing: {
        endTime?: number
        startTime?: number
      }
    ) => {
      const { project, selectedClipCandidateId } = get()
      const clipCandidate = project.clipCandidates.find(
        (item) => item.id === clipCandidateId
      )

      if (!clipCandidate) {
        return
      }

      const minimumClipDurationSeconds = project.media.durationSeconds >= 1 ? 1 : 0
      const startTimeLimit = Math.max(
        0,
        clipCandidate.endTime - minimumClipDurationSeconds
      )
      const nextStartTime =
        typeof timing.startTime === "number"
          ? clampTime(timing.startTime, startTimeLimit)
          : clipCandidate.startTime
      const endTimeFloor = Math.min(
        project.media.durationSeconds,
        nextStartTime + minimumClipDurationSeconds
      )
      const nextEndTime =
        typeof timing.endTime === "number"
          ? Math.max(
              endTimeFloor,
              clampTime(timing.endTime, project.media.durationSeconds)
            )
          : clipCandidate.endTime
      const nextDuration = Number(Math.max(0, nextEndTime - nextStartTime).toFixed(2))

      if (
        nextStartTime === clipCandidate.startTime &&
        nextEndTime === clipCandidate.endTime &&
        nextDuration === clipCandidate.duration
      ) {
        return
      }

      recordEditorHistory(set, get)

      set((state) => ({
        currentTime:
          selectedClipCandidateId === clipCandidateId
            ? clampTime(state.currentTime, nextEndTime)
            : state.currentTime,
        project: {
          ...state.project,
          clipCandidates: state.project.clipCandidates.map((item) =>
            item.id === clipCandidateId
              ? {
                  ...item,
                  duration: nextDuration,
                  endTime: nextEndTime,
                  startTime: nextStartTime,
                }
              : item
          ),
        },
      }))
    },
    updateShortClipDetails: (
      shortClipId: string,
      details: ShortClipDetailsUpdate
    ) => {
      const shortClip = get().project.shortClips.find((item) => item.id === shortClipId)

      if (!shortClip) {
        return
      }

      const hasChanges = Object.entries(details).some(([key, value]) => {
        return shortClip[key as keyof typeof details] !== value
      })

      if (!hasChanges) {
        return
      }

      recordEditorHistory(set, get)

      set((state) => ({
        project: {
          ...state.project,
          shortClips: state.project.shortClips.map((item) =>
            item.id === shortClipId ? { ...item, ...details } : item
          ),
        },
      }))
    },
    updateShortClipTiming: (
      shortClipId: string,
      timing: {
        endTime?: number
        startTime?: number
      }
    ) => {
      const { project, selectedShortClipId } = get()
      const shortClip = project.shortClips.find((item) => item.id === shortClipId)

      if (!shortClip) {
        return
      }

      const minimumClipDurationSeconds = project.media.durationSeconds >= 1 ? 1 : 0
      const startTimeLimit = Math.max(0, shortClip.endTime - minimumClipDurationSeconds)
      const nextStartTime =
        typeof timing.startTime === "number"
          ? clampTime(timing.startTime, startTimeLimit)
          : shortClip.startTime
      const endTimeFloor = Math.min(
        project.media.durationSeconds,
        nextStartTime + minimumClipDurationSeconds
      )
      const nextEndTime =
        typeof timing.endTime === "number"
          ? Math.max(
              endTimeFloor,
              clampTime(timing.endTime, project.media.durationSeconds)
            )
          : shortClip.endTime
      const nextDuration = Number(Math.max(0, nextEndTime - nextStartTime).toFixed(2))

      if (
        nextStartTime === shortClip.startTime &&
        nextEndTime === shortClip.endTime &&
        nextDuration === shortClip.duration
      ) {
        return
      }

      recordEditorHistory(set, get)

      set((state) => ({
        currentTime:
          selectedShortClipId === shortClipId
            ? clampTime(state.currentTime, nextEndTime)
            : state.currentTime,
        project: {
          ...state.project,
          shortClips: state.project.shortClips.map((item) =>
            item.id === shortClipId
              ? {
                  ...item,
                  duration: nextDuration,
                  endTime: nextEndTime,
                  startTime: nextStartTime,
                }
              : item
          ),
        },
      }))
    },
  }
}
