"use client"

import {
  cloneProject,
  cloneSavedTranscriptSnapshot,
  createHistorySnapshot,
  MAX_HISTORY_SNAPSHOTS,
} from "../studio-editor-state"
import type {
  StudioEditorGet,
  StudioEditorSet,
} from "../studio-editor-store.types"

export function recordEditorHistory(
  set: StudioEditorSet,
  get: StudioEditorGet
) {
  const snapshot = createHistorySnapshot(get())

  set((state) => ({
    historyFuture: [],
    historyPast: [
      ...state.historyPast.slice(-(MAX_HISTORY_SNAPSHOTS - 1)),
      snapshot,
    ],
  }))
}

export function createHistoryActions(
  set: StudioEditorSet,
  get: StudioEditorGet
) {
  return {
    redoEditorChange: () => {
      const nextSnapshot = get().historyFuture[0]

      if (!nextSnapshot) {
        return
      }

      set((state) => ({
        hasUnsavedTranscriptChanges: nextSnapshot.hasUnsavedTranscriptChanges,
        historyFuture: state.historyFuture.slice(1),
        historyPast: [
          ...state.historyPast.slice(-(MAX_HISTORY_SNAPSHOTS - 1)),
          createHistorySnapshot(state),
        ],
        project: cloneProject(nextSnapshot.project),
        savedTranscriptState: cloneSavedTranscriptSnapshot(
          nextSnapshot.savedTranscriptState
        ),
      }))
    },
    undoEditorChange: () => {
      const previousSnapshot = get().historyPast.at(-1)

      if (!previousSnapshot) {
        return
      }

      set((state) => ({
        hasUnsavedTranscriptChanges: previousSnapshot.hasUnsavedTranscriptChanges,
        historyFuture: [createHistorySnapshot(state), ...state.historyFuture],
        historyPast: state.historyPast.slice(0, -1),
        project: cloneProject(previousSnapshot.project),
        savedTranscriptState: cloneSavedTranscriptSnapshot(
          previousSnapshot.savedTranscriptState
        ),
      }))
    },
  }
}
