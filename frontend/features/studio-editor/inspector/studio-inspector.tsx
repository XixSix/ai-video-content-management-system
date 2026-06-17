"use client"

import { AssetsPlaceholderInspector } from "@/features/studio-editor/inspector/components/assets-placeholder-inspector"
import { CaptionInspector } from "@/features/studio-editor/inspector/components/caption-inspector"
import { ChapterInspector } from "@/features/studio-editor/inspector/components/chapter-inspector"
import { DefaultInspector } from "@/features/studio-editor/inspector/components/default-inspector"
import { MediaInspector } from "@/features/studio-editor/inspector/components/media-inspector"
import { TextInspector } from "@/features/studio-editor/inspector/components/text-inspector"
import {
  useStudioProjectState,
  useStudioSelectionState,
  useStudioToolState,
} from "@/features/studio-editor/store/studio-editor-store"

export function StudioInspector() {
  const { project } = useStudioProjectState()
  const { selectedChapterId, selectedItem } = useStudioSelectionState()
  const { activeTool } = useStudioToolState()
  const selectedChapter =
    project.chapters.find((chapter) => chapter.id === selectedChapterId) ?? null
  const selectedTextLayer =
    selectedItem.kind === "layer" && selectedItem.layer.kind === "text"
      ? selectedItem.layer
      : selectedItem.kind === "segment" && activeTool === "text"
        ? project.layers.find(
            (layer) =>
              layer.id === selectedItem.linkedSelectionId && layer.kind === "text"
          )
        : null

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Inspector</p>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
        {activeTool === "chapters" && selectedChapter ? (
          <ChapterInspector key={selectedChapter.id} chapter={selectedChapter} />
        ) : activeTool === "assets" ? (
          <AssetsPlaceholderInspector />
        ) : selectedTextLayer ? (
          <TextInspector layer={selectedTextLayer} />
        ) : selectedItem.kind === "layer" && selectedItem.layer.kind === "captions" ? (
          <CaptionInspector layer={selectedItem.layer} />
        ) : selectedItem.kind === "media" ? (
          <MediaInspector media={selectedItem.media} />
        ) : (
          <DefaultInspector selectedItem={selectedItem} />
        )}
      </div>
    </aside>
  )
}
