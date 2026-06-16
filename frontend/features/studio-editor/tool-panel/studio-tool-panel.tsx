"use client"

import { ChaptersPanel } from "@/features/studio-editor/components/chapters-panel"
import { StudioCaptionsPanel } from "@/features/studio-editor/captions/studio-captions-panel"
import { MediaPanel } from "@/features/studio-editor/components/media-panel"
import { TextPanel } from "@/features/studio-editor/components/text-panel"
import { useStudioToolState } from "@/features/studio-editor/store/studio-editor-store"
import { GenericToolPanel } from "@/features/studio-editor/tool-panel/components/generic-tool-panel"

export function StudioToolPanel() {
  const { activeTool } = useStudioToolState()

  if (activeTool === "media") {
    return <MediaPanel />
  }

  if (activeTool === "text") {
    return <TextPanel />
  }

  if (activeTool === "captions") {
    return <StudioCaptionsPanel />
  }

  if (activeTool === "chapters") {
    return <ChaptersPanel />
  }

  return <GenericToolPanel />
}
