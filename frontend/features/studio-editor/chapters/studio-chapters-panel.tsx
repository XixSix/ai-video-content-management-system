"use client"

import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  useStudioChapterActions,
  useStudioPlaybackState,
  useStudioProjectState,
  useStudioSelectionState,
} from "@/features/studio-editor/store/studio-editor-store"
import { StudioPanelShell } from "@/features/studio-editor/tool-panel/components/studio-panel-shell"

import { ChapterList } from "./components/chapter-list"
import { getCurrentChapterId } from "./lib/chapter-display"

export function StudioChaptersPanel() {
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
      <ChapterList
        chapters={chapters}
        currentChapterId={currentChapterId}
        onSelectChapter={selectChapter}
        selectedChapterId={selectedChapterId}
      />
    </StudioPanelShell>
  )
}
