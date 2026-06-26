"use client"

import { hydrateStudioProjectAiOutputs } from "../../editor-snapshot/editor-snapshot.mapper"
import { cloneSavedTranscriptState } from "../studio-editor-state"
import type {
  StudioEditorGet,
  StudioEditorSet,
} from "../studio-editor-store.types"

export function createAiOutputActions(
  set: StudioEditorSet,
  get: StudioEditorGet
) {
  return {
    hydrateProjectAiOutputs: (
      input: Parameters<typeof hydrateStudioProjectAiOutputs>[1]
    ) => {
      const currentProject = get().project
      const nextProject = hydrateStudioProjectAiOutputs(currentProject, input)

      set((state) => ({
        hasUnsavedTranscriptChanges: input.transcriptEditor
          ? false
          : state.hasUnsavedTranscriptChanges,
        project: nextProject,
        savedTranscriptState: input.transcriptEditor
          ? cloneSavedTranscriptState(nextProject)
          : state.savedTranscriptState,
      }))
    },
  }
}
