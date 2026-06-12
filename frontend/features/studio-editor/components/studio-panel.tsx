"use client"

import { useStudioEditor } from "@/features/studio-editor/studio-editor-context"
import { CaptionsPanel } from "@/features/studio-editor/components/captions-panel"
import { GenericToolPanel } from "@/features/studio-editor/components/generic-tool-panel"

export function StudioPanel() {
  const { activeTool } = useStudioEditor()

  if (activeTool === "captions") {
    return <CaptionsPanel />
  }

  return <GenericToolPanel />
}
