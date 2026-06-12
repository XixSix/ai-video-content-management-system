"use client"

import { createContext, useContext, useState } from "react"

import {
  getStudioSelectionById,
  studioEditorProject,
  studioToolPanels,
} from "./studio.data"
import type {
  StudioEditorProject,
  StudioSelection,
  StudioStaleOutputType,
  StudioToolId,
} from "./studio.types"

function clampTime(timeSeconds: number, durationSeconds: number) {
  return Math.min(durationSeconds, Math.max(0, timeSeconds))
}

type StudioEditorContextValue = {
  activeTool: StudioToolId
  currentTime: number
  hasStaleAssets: boolean
  hasStaleChapters: boolean
  hasStaleClips: boolean
  hasUnsavedTranscriptChanges: boolean
  project: StudioEditorProject
  selectedChapterId: string | null
  selectedClipCandidateId: string | null
  selectedItem: StudioSelection
  selectedTranscriptSegmentId: string | null
  selectedTargetId: string
  staleOutputTypes: StudioStaleOutputType[]
  markTranscriptDirty: () => void
  saveTranscriptMock: () => void
  seekToTime: (timeSeconds: number) => void
  setActiveTool: (toolId: StudioToolId) => void
  setSelectedItemId: (selectionId: string) => void
  selectChapter: (chapterId: string) => void
  selectClipCandidate: (clipCandidateId: string) => void
  selectTranscriptSegment: (segmentId: string) => void
  toolPanel: (typeof studioToolPanels)[StudioToolId]
}

const StudioEditorContext = createContext<StudioEditorContextValue | null>(null)

export function StudioEditorProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [project, setProject] = useState<StudioEditorProject>(studioEditorProject)
  const [activeTool, setActiveTool] = useState<StudioToolId>("media")
  const [selectedItemId, setSelectedItemId] = useState("source-media")
  const [currentTime, setCurrentTime] = useState(18.22)
  const [selectedTranscriptSegmentId, setSelectedTranscriptSegmentId] = useState<string | null>(
    null
  )
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [selectedClipCandidateId, setSelectedClipCandidateId] = useState<string | null>(null)
  const [hasUnsavedTranscriptChanges, setHasUnsavedTranscriptChanges] = useState(false)
  const selectedItem = getStudioSelectionById(project, selectedItemId)
  const transcriptVersion = project.transcript.version
  const hasStaleChapters = project.chapters.some(
    (chapter) => chapter.transcriptVersion < transcriptVersion
  )
  const hasStaleClips =
    project.clipCandidates.some(
      (clipCandidate) => clipCandidate.transcriptVersion < transcriptVersion
    ) ||
    project.shortClips.some((shortClip) => shortClip.transcriptVersion < transcriptVersion)
  const hasStaleAssets = project.generatedAssets.some(
    (asset) => asset.transcriptVersion < transcriptVersion
  )
  const staleOutputTypes: StudioStaleOutputType[] = []

  if (hasStaleChapters) {
    staleOutputTypes.push("chapters")
  }

  if (hasStaleClips) {
    staleOutputTypes.push("clips")
  }

  if (hasStaleAssets) {
    staleOutputTypes.push("assets")
  }

  const seekToTime = (timeSeconds: number) => {
    setCurrentTime(clampTime(timeSeconds, project.media.durationSeconds))
  }

  const selectTranscriptSegment = (segmentId: string) => {
    const segment = project.transcriptSegments.find((item) => item.id === segmentId)

    if (!segment) {
      return
    }

    setActiveTool("captions")
    setSelectedTranscriptSegmentId(segmentId)
    setSelectedChapterId(null)
    setSelectedClipCandidateId(null)
    setCurrentTime(segment.startTime)
  }

  const selectChapter = (chapterId: string) => {
    const chapter = project.chapters.find((item) => item.id === chapterId)

    if (!chapter) {
      return
    }

    setActiveTool("chapters")
    setSelectedChapterId(chapterId)
    setSelectedTranscriptSegmentId(null)
    setSelectedClipCandidateId(null)
    setCurrentTime(chapter.startTime)
  }

  const selectClipCandidate = (clipCandidateId: string) => {
    const clipCandidate = project.clipCandidates.find((item) => item.id === clipCandidateId)

    if (!clipCandidate) {
      return
    }

    setActiveTool("clips")
    setSelectedClipCandidateId(clipCandidateId)
    setSelectedTranscriptSegmentId(null)
    setSelectedChapterId(null)
    setCurrentTime(clipCandidate.startTime)
  }

  const markTranscriptDirty = () => {
    setHasUnsavedTranscriptChanges(true)
  }

  const saveTranscriptMock = () => {
    setProject((currentProject) => ({
      ...currentProject,
      transcript: {
        ...currentProject.transcript,
        version: currentProject.transcript.version + 1,
        isEdited: true,
      },
    }))
    setHasUnsavedTranscriptChanges(false)
  }

  const value: StudioEditorContextValue = {
    activeTool,
    currentTime,
    hasStaleAssets,
    hasStaleChapters,
    hasStaleClips,
    hasUnsavedTranscriptChanges,
    markTranscriptDirty,
    project,
    saveTranscriptMock,
    seekToTime,
    selectChapter,
    selectClipCandidate,
    selectedChapterId,
    selectedClipCandidateId,
    selectedItem,
    selectedTranscriptSegmentId,
    selectedTargetId:
      selectedItem.kind === "segment"
        ? selectedItem.linkedSelectionId
        : selectedItem.kind === "media" && selectedItem.linkedSelectionId
          ? selectedItem.linkedSelectionId
          : selectedItem.id,
    selectTranscriptSegment,
    staleOutputTypes,
    setActiveTool,
    setSelectedItemId,
    toolPanel: studioToolPanels[activeTool],
  }

  return (
    <StudioEditorContext.Provider value={value}>
      {children}
    </StudioEditorContext.Provider>
  )
}

export function useStudioEditor() {
  const context = useContext(StudioEditorContext)

  if (!context) {
    throw new Error("useStudioEditor must be used within StudioEditorProvider.")
  }

  return context
}
