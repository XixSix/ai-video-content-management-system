"use client"

import { clampTime } from "../studio-editor-state"
import { recordEditorHistory } from "./history-actions"
import type {
  StudioEditorGet,
  StudioEditorSet,
} from "../studio-editor-store.types"

export function createChapterActions(
  set: StudioEditorSet,
  get: StudioEditorGet
) {
  return {
    addChapterToEnd: () => {
      const { project } = get()
      const lastChapter = [...project.chapters]
        .sort((left, right) => left.endTime - right.endTime)
        .at(-1)
      const nextStartTime = lastChapter?.endTime ?? 0

      if (nextStartTime >= project.media.durationSeconds) {
        return
      }

      recordEditorHistory(set, get)

      const nextChapterId = `chapter_${Date.now()}`
      const nextChapter = {
        id: nextChapterId,
        chapterIndex: project.chapters.length + 1,
        startTime: nextStartTime,
        endTime: project.media.durationSeconds,
        title: "Untitled chapter",
        summary: "",
        transcriptVersion: project.transcript.version,
        score: 0,
      }

      set((state) => ({
        activeTool: "chapters",
        currentTime: nextStartTime,
        project: {
          ...state.project,
          chapters: [...state.project.chapters, nextChapter],
        },
        selectedChapterId: nextChapterId,
        selectedClipCandidateId: null,
        selectedShortClipId: null,
        selectedTranscriptSegmentId: null,
      }))
    },
    updateChapterTiming: (
      chapterId: string,
      timing: {
        endTime?: number
        startTime?: number
      }
    ) => {
      const { project, selectedChapterId } = get()
      const chapter = project.chapters.find((item) => item.id === chapterId)

      if (!chapter) {
        return
      }

      const minimumChapterDurationSeconds =
        project.media.durationSeconds >= 1 ? 1 : 0
      const startTimeLimit = Math.max(
        0,
        chapter.endTime - minimumChapterDurationSeconds
      )
      const nextStartTime =
        typeof timing.startTime === "number"
          ? clampTime(timing.startTime, startTimeLimit)
          : chapter.startTime
      const endTimeFloor = Math.min(
        project.media.durationSeconds,
        nextStartTime + minimumChapterDurationSeconds
      )
      const nextEndTime =
        typeof timing.endTime === "number"
          ? Math.max(
              endTimeFloor,
              clampTime(timing.endTime, project.media.durationSeconds)
            )
          : chapter.endTime

      if (
        nextStartTime === chapter.startTime &&
        nextEndTime === chapter.endTime
      ) {
        return
      }

      recordEditorHistory(set, get)

      set((state) => ({
        currentTime:
          selectedChapterId === chapterId
            ? clampTime(state.currentTime, nextEndTime)
            : state.currentTime,
        project: {
          ...state.project,
          chapters: state.project.chapters.map((item) =>
            item.id === chapterId
              ? {
                  ...item,
                  endTime: nextEndTime,
                  startTime: nextStartTime,
                }
              : item
          ),
        },
      }))
    },
    updateChapterTitle: (chapterId: string, title: string) => {
      const nextTitle = title
      const chapter = get().project.chapters.find((item) => item.id === chapterId)

      if (!chapter || chapter.title === nextTitle) {
        return
      }

      recordEditorHistory(set, get)

      set((state) => ({
        project: {
          ...state.project,
          chapters: state.project.chapters.map((item) =>
            item.id === chapterId ? { ...item, title: nextTitle } : item
          ),
        },
      }))
    },
  }
}
