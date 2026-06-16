"use client"

import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StudioPanelShell } from "@/features/studio-editor/tool-panel/components/studio-panel-shell"
import {
  useStudioChapterActions,
  useStudioPlaybackState,
  useStudioProjectState,
  useStudioSelectionState,
} from "@/features/studio-editor/store/studio-editor-store"
import type { StudioChapter } from "@/features/studio-editor/studio.types"
import { cn } from "@/lib/utils"

function formatChapterTime(timeSeconds: number) {
  const totalSeconds = Math.max(0, Math.floor(timeSeconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function getChapterRangeLabel(chapter: StudioChapter) {
  return `${formatChapterTime(chapter.startTime)} - ${formatChapterTime(chapter.endTime)}`
}

function getChapterDurationLabel(chapter: StudioChapter) {
  return formatChapterTime(Math.max(0, chapter.endTime - chapter.startTime))
}

function getCurrentChapterId(
  chapters: StudioChapter[],
  currentTime: number
) {
  return chapters.find((chapter) => {
    return currentTime >= chapter.startTime && currentTime < chapter.endTime
  })?.id
}

export function ChaptersPanel() {
  const { addChapterToEnd } = useStudioChapterActions()
  const { currentTime } = useStudioPlaybackState()
  const { project } = useStudioProjectState()
  const { selectChapter, selectedChapterId } = useStudioSelectionState()
  const chapters = [...project.chapters].sort(
    (left, right) => left.chapterIndex - right.chapterIndex
  )
  const currentChapterId = getCurrentChapterId(chapters, currentTime)
  const lastChapterEndTime = chapters.reduce((furthestEndTime, chapter) => {
    return Math.max(furthestEndTime, chapter.endTime)
  }, 0)
  const canAddChapter = lastChapterEndTime < project.media.durationSeconds

  return (
    <StudioPanelShell
      title="Chapters"
      headerActions={
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          aria-label="Add chapter"
          disabled={!canAddChapter}
          onClick={addChapterToEnd}
        >
          <Plus />
        </Button>
      }
    >
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
              <button
                key={chapter.id}
                type="button"
                onClick={() => selectChapter(chapter.id)}
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
          })}
        </div>
      </div>
    </StudioPanelShell>
  )
}
