"use client"

import { CaptionInspector } from "@/features/studio-editor/inspector/components/caption-inspector"
import { ChapterInspector } from "@/features/studio-editor/inspector/components/chapter-inspector"
import { DefaultInspector } from "@/features/studio-editor/inspector/components/default-inspector"
import { MediaInspector } from "@/features/studio-editor/inspector/components/media-inspector"
import { TextInspector } from "@/features/studio-editor/inspector/components/text-inspector"
import { useStudioEditor } from "@/features/studio-editor/studio-editor-context"

export function StudioInspector() {
  const { activeTool, project, selectedChapterId, selectedItem } = useStudioEditor()
  const selectedChapter =
    project.chapters.find((chapter) => chapter.id === selectedChapterId) ?? null

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Inspector</p>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
        {activeTool === "chapters" && selectedChapter ? (
          <ChapterInspector key={selectedChapter.id} chapter={selectedChapter} />
        ) : selectedItem.kind === "layer" && selectedItem.layer.kind === "text" ? (
          <TextInspector layer={selectedItem.layer} />
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
