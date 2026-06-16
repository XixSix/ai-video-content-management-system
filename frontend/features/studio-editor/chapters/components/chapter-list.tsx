import type { StudioChapter } from "@/features/studio-editor/studio.types"

import { ChapterRow } from "./chapter-row"

export function ChapterList({
  chapters,
  currentChapterId,
  onSelectChapter,
  selectedChapterId,
}: {
  chapters: StudioChapter[]
  currentChapterId: string | undefined
  onSelectChapter: (chapterId: string) => void
  selectedChapterId: string | null
}) {
  return (
    <div className="flex flex-1 flex-col overflow-auto p-4">
      <div className="rounded-xl border border-border bg-surface-muted px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Chapter list
          </p>
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {chapters.length}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {chapters.map((chapter) => {
          const isSelected =
            selectedChapterId === chapter.id ||
            (selectedChapterId === null && currentChapterId === chapter.id)

          return (
            <ChapterRow
              key={chapter.id}
              chapter={chapter}
              isSelected={isSelected}
              onSelect={onSelectChapter}
            />
          )
        })}
      </div>
    </div>
  )
}
