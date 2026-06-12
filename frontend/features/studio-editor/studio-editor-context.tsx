"use client"

import { createContext, useContext, useState } from "react"

import {
  getStudioSelectionById,
  studioEditorProject,
  studioToolPanels,
} from "./studio.data"
import type { StudioSelection, StudioToolId } from "./studio.types"

type StudioEditorContextValue = {
  activeTool: StudioToolId
  project: typeof studioEditorProject
  selectedItem: StudioSelection
  selectedTargetId: string
  setActiveTool: (toolId: StudioToolId) => void
  setSelectedItemId: (selectionId: string) => void
  toolPanel: (typeof studioToolPanels)[StudioToolId]
}

const StudioEditorContext = createContext<StudioEditorContextValue | null>(null)

export function StudioEditorProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [activeTool, setActiveTool] = useState<StudioToolId>("media")
  const [selectedItemId, setSelectedItemId] = useState("hook-copy")
  const selectedItem = getStudioSelectionById(selectedItemId)

  const value: StudioEditorContextValue = {
    activeTool,
    project: studioEditorProject,
    selectedItem,
    selectedTargetId:
      selectedItem.kind === "segment" ? selectedItem.linkedSelectionId : selectedItem.id,
    setActiveTool,
    setSelectedItemId,
    toolPanel: studioToolPanels[activeTool],
  }

  return (
    <StudioEditorContext.Provider value={value}>
      {children}
    </StudioEditorContext.Provider>
  )
}

export function useStudioEditor() {
  const context = useContext(StudioEditorContext)

  if (!context) {
    throw new Error("useStudioEditor must be used within StudioEditorProvider.")
  }

  return context
}
