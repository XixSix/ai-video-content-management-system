"use client"

import type { StudioToolId } from "../../studio.types"
import type { StudioEditorSet } from "../studio-editor-store.types"

export function createToolActions(set: StudioEditorSet) {
  return {
    setActiveTool: (toolId: StudioToolId) => {
      set({ activeTool: toolId })
    },
  }
}
