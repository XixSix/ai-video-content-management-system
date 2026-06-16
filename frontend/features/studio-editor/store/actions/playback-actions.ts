"use client"

import { getProjectTimelineDuration } from "../../timeline/lib/layout"
import { clampTime } from "../studio-editor-state"
import type {
  StudioEditorGet,
  StudioEditorSet,
} from "../studio-editor-store.types"

export function createPlaybackActions(
  set: StudioEditorSet,
  get: StudioEditorGet
) {
  return {
    pausePlayback: () => {
      set({ isPlaying: false })
    },
    playPlayback: () => {
      const timelineDurationSeconds = getProjectTimelineDuration(get().project)

      set((state) => ({
        currentTime:
          state.currentTime >= timelineDurationSeconds
            ? 0
            : clampTime(state.currentTime, timelineDurationSeconds),
        isPlaying: true,
      }))
    },
    seekToTime: (timeSeconds: number) => {
      const timelineDurationSeconds = getProjectTimelineDuration(get().project)
      const nextTime = clampTime(timeSeconds, timelineDurationSeconds)

      set({
        currentTime: nextTime,
        isPlaying: nextTime >= timelineDurationSeconds ? false : get().isPlaying,
      })
    },
    togglePlayback: () => {
      if (get().isPlaying) {
        get().pausePlayback()
        return
      }

      get().playPlayback()
    },
    toggleTrackMute: (trackId: string) => {
      set((state) => ({
        mutedTrackIds: state.mutedTrackIds.includes(trackId)
          ? state.mutedTrackIds.filter((mutedTrackId) => mutedTrackId !== trackId)
          : [...state.mutedTrackIds, trackId],
      }))
    },
  }
}
