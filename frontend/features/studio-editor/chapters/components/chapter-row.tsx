import type { StudioChapter } from "@/features/studio-editor/studio.types"
import { cn } from "@/lib/utils"

import {
  getChapterDurationLabel,
  getChapterRangeLabel,
} from "../lib/chapter-display"

export function ChapterRow({
  chapter,
  isSelected,
  onSelect,
}: {
  chapter: StudioChapter
  isSelected: boolean
  onSelect: (chapterId: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(chapter.id)}
      className={cn(
        "group w-full rounded-xl border px-3 py-3 text-left transition",
        isSelected
          ? "border-sky-500/50 bg-sky-500/8 shadow-[0_0_0_1px_rgba(14,165,233,0.18)]"
          : "border-border bg-background hover:border-foreground/18 hover:bg-surface-muted/35"
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold",
            isSelected
              ? "border-sky-500/30 bg-sky-500/12 text-sky-700 dark:text-sky-300"
              : "border-border bg-surface-muted text-muted-foreground"
          )}
        >
          {String(chapter.chapterIndex).padStart(2, "0")}
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium text-foreground">
              {chapter.title || "Untitled chapter"}
            </p>
            <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {getChapterDurationLabel(chapter)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {getChapterRangeLabel(chapter)}
          </p>
        </div>
      </div>
    </button>
  )
}
