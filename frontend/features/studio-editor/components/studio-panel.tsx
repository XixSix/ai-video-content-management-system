"use client"

import { useStudioEditor } from "@/features/studio-editor/studio-editor-context"
import { CaptionsPanel } from "@/features/studio-editor/components/captions-panel"
import { GenericToolPanel } from "@/features/studio-editor/components/generic-tool-panel"
import { MediaPanel } from "@/features/studio-editor/components/media-panel"

export function StudioPanel() {
  const { activeTool } = useStudioEditor()

  if (activeTool === "media") {
    return <MediaPanel />
  }

  if (activeTool === "captions") {
    return <CaptionsPanel />
  }

  return <GenericToolPanel />
}
