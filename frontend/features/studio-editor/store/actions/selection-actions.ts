"use client"

import type {
  StudioEditorGet,
  StudioEditorSet,
} from "../studio-editor-store.types"

export function createSelectionActions(
  set: StudioEditorSet,
  get: StudioEditorGet
) {
  return {
    selectChapter: (chapterId: string) => {
      const chapter = get().project.chapters.find((item) => item.id === chapterId)

      if (!chapter) {
        return
      }

      set({
        activeTool: "chapters",
        currentTime: chapter.startTime,
        selectedChapterId: chapterId,
        selectedClipCandidateId: null,
        selectedShortClipId: null,
        selectedTranscriptSegmentId: null,
      })
    },
    selectClipCandidate: (clipCandidateId: string) => {
      const { project } = get()
      const clipCandidate = project.clipCandidates.find(
        (item) => item.id === clipCandidateId
      )

      if (!clipCandidate) {
        return
      }

      set({
        activeTool: "clips",
        currentTime: clipCandidate.startTime,
        selectedChapterId: null,
        selectedClipCandidateId: clipCandidateId,
        selectedItemId: project.sourceMedia.id,
        selectedShortClipId: null,
        selectedTranscriptSegmentId: null,
      })
    },
    selectShortClip: (shortClipId: string) => {
      const { project } = get()
      const shortClip = project.shortClips.find((item) => item.id === shortClipId)

      if (!shortClip) {
        return
      }

      set({
        activeTool: "clips",
        currentTime: shortClip.startTime,
        selectedChapterId: null,
        selectedClipCandidateId: null,
        selectedItemId: project.sourceMedia.id,
        selectedShortClipId: shortClipId,
        selectedTranscriptSegmentId: null,
      })
    },
    selectTranscriptSegment: (segmentId: string) => {
      const segment = get().project.transcriptSegments.find(
        (item) => item.id === segmentId
      )

      if (!segment) {
        return
      }

      set({
        activeTool: "captions",
        currentTime: segment.startTime,
        selectedChapterId: null,
        selectedClipCandidateId: null,
        selectedShortClipId: null,
        selectedTranscriptSegmentId: segmentId,
      })
    },
    setSelectedItemId: (selectionId: string) => {
      set({ selectedItemId: selectionId })
    },
  }
}
