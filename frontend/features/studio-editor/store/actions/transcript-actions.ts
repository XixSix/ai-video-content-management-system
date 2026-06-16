"use client"

import {
  rebuildTranscriptMeta,
  rebuildTranscriptSegmentsFromWords,
} from "../../studio-captions"
import { cloneSavedTranscriptState } from "../studio-editor-state"
import { recordEditorHistory } from "./history-actions"
import type {
  StudioEditorGet,
  StudioEditorSet,
} from "../studio-editor-store.types"

export function createTranscriptActions(
  set: StudioEditorSet,
  get: StudioEditorGet
) {
  return {
    commitTranscriptWordText: (wordId: string, text: string) => {
      const { project } = get()
      const nextText = text.trim()
      const currentWord = project.transcriptWords.find((word) => word.id === wordId)

      if (!currentWord || currentWord.text === nextText) {
        return
      }

      recordEditorHistory(set, get)

      const transcriptWords = project.transcriptWords.map((word) =>
        word.id === wordId ? { ...word, text: nextText } : word
      )
      const transcriptSegments = rebuildTranscriptSegmentsFromWords(
        project.transcriptSegments,
        transcriptWords
      )
      const transcript = {
        ...rebuildTranscriptMeta(project.transcript, transcriptSegments, transcriptWords),
        version: project.transcript.version + 1,
      }
      const nextProject = {
        ...project,
        transcript,
        transcriptSegments,
        transcriptWords,
      }

      set({
        hasUnsavedTranscriptChanges: false,
        project: nextProject,
        savedTranscriptState: cloneSavedTranscriptState(nextProject),
      })
    },
    discardTranscriptChanges: () => {
      const { hasUnsavedTranscriptChanges, savedTranscriptState } = get()

      if (!hasUnsavedTranscriptChanges) {
        return
      }

      recordEditorHistory(set, get)

      set((state) => ({
        hasUnsavedTranscriptChanges: false,
        project: {
          ...state.project,
          transcript: { ...savedTranscriptState.transcript },
          transcriptSegments: savedTranscriptState.transcriptSegments.map((segment) => ({
            ...segment,
          })),
          transcriptWords: savedTranscriptState.transcriptWords.map((word) => ({
            ...word,
          })),
        },
      }))
    },
    markTranscriptDirty: () => {
      set({ hasUnsavedTranscriptChanges: true })
    },
    saveTranscriptMock: () => {
      const { project } = get()

      recordEditorHistory(set, get)

      const transcriptSegments = rebuildTranscriptSegmentsFromWords(
        project.transcriptSegments,
        project.transcriptWords
      )
      const transcript = {
        ...rebuildTranscriptMeta(
          project.transcript,
          transcriptSegments,
          project.transcriptWords
        ),
        version: project.transcript.version + 1,
      }
      const nextProject = {
        ...project,
        transcript,
        transcriptSegments,
      }

      set({
        hasUnsavedTranscriptChanges: false,
        project: nextProject,
        savedTranscriptState: cloneSavedTranscriptState(nextProject),
      })
    },
    updateTranscriptWordText: (wordId: string, text: string) => {
      const word = get().project.transcriptWords.find((item) => item.id === wordId)

      if (!word || word.text === text) {
        return
      }

      recordEditorHistory(set, get)

      set((state) => ({
        hasUnsavedTranscriptChanges: true,
        project: {
          ...state.project,
          transcriptWords: state.project.transcriptWords.map((word) =>
            word.id === wordId ? { ...word, text } : word
          ),
        },
      }))
    },
  }
}
