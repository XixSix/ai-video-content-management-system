"use client"

import { ChaptersPanel } from "@/features/studio-editor/components/chapters-panel"
import { CaptionsPanel } from "@/features/studio-editor/components/captions-panel"
import { GenericToolPanel } from "@/features/studio-editor/components/generic-tool-panel"
import { MediaPanel } from "@/features/studio-editor/components/media-panel"
import { TextPanel } from "@/features/studio-editor/components/text-panel"
import { useStudioToolState } from "@/features/studio-editor/store/studio-editor-store"

export function StudioPanel() {
  const { activeTool } = useStudioToolState()

  if (activeTool === "media") {
    return <MediaPanel />
  }

  if (activeTool === "text") {
    return <TextPanel />
  }

  if (activeTool === "captions") {
    return <CaptionsPanel />
  }

  if (activeTool === "chapters") {
    return <ChaptersPanel />
  }

  return <GenericToolPanel />
}
