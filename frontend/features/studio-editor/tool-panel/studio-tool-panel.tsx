"use client"

import { StudioCaptionsPanel } from "@/features/studio-editor/captions/studio-captions-panel"
import { StudioChaptersPanel } from "@/features/studio-editor/chapters/studio-chapters-panel"
import { StudioMediaPanel } from "@/features/studio-editor/media-panel/studio-media-panel"
import { useStudioToolState } from "@/features/studio-editor/store/studio-editor-store"
import { StudioTextPanel } from "@/features/studio-editor/text-panel/studio-text-panel"
import { GenericToolPanel } from "@/features/studio-editor/tool-panel/components/generic-tool-panel"

export function StudioToolPanel() {
  const { activeTool } = useStudioToolState()

  if (activeTool === "media") {
    return <StudioMediaPanel />
  }

  if (activeTool === "text") {
    return <StudioTextPanel />
  }

  if (activeTool === "captions") {
    return <StudioCaptionsPanel />
  }

  if (activeTool === "chapters") {
    return <StudioChaptersPanel />
  }

  return <GenericToolPanel />
}
