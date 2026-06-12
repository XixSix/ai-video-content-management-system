"use client"

import { createContext, useContext, useState } from "react"

import {
  getStudioSelectionById,
  studioEditorProject,
  studioTextPresets,
  studioToolPanels,
} from "./studio.data"
import type {
  StudioCanvasLayer,
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
  addTextLayerFromPreset: (presetId: string) => void
  markTranscriptDirty: () => void
  saveTranscriptMock: () => void
  seekToTime: (timeSeconds: number) => void
  setActiveTool: (toolId: StudioToolId) => void
  setSelectedItemId: (selectionId: string) => void
  selectChapter: (chapterId: string) => void
  selectClipCandidate: (clipCandidateId: string) => void
  selectTranscriptSegment: (segmentId: string) => void
  toolPanel: (typeof studioToolPanels)[StudioToolId]
  updateTextLayerContent: (layerId: string, content: string) => void
  updateTextLayerStyle: (
    layerId: string,
    style: Partial<
      Pick<
        StudioCanvasLayer,
        | "animationBy"
        | "animationDuration"
        | "animationName"
        | "backgroundColor"
        | "backgroundRadius"
        | "backgroundStyle"
        | "boxWidth"
        | "fontFamily"
        | "fontSize"
        | "fontStyle"
        | "fontWeight"
        | "textAlign"
        | "textColor"
      >
    >
  ) => void
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

  const addTextLayerFromPreset = (presetId: string) => {
    const preset = studioTextPresets.find((item) => item.id === presetId)

    if (!preset) {
      return
    }

    const layerId = `text-${Date.now()}`
    const nextLayer: StudioCanvasLayer = {
      id: layerId,
      kind: "text",
      label: preset.label,
      summary: preset.styleSummary,
      animationBy: preset.defaultStyle.animationBy,
      animationDuration: preset.defaultStyle.animationDuration,
      animationName: preset.defaultStyle.animationName,
      backgroundColor: preset.defaultStyle.backgroundColor,
      backgroundRadius: preset.defaultStyle.backgroundRadius,
      backgroundStyle: preset.defaultStyle.backgroundStyle,
      boxWidth: preset.defaultStyle.boxWidth,
      className: preset.className,
      content: preset.previewText,
      fontFamily: preset.defaultStyle.fontFamily,
      fontSize: preset.defaultStyle.fontSize,
      fontStyle: preset.defaultStyle.fontStyle,
      fontWeight: preset.defaultStyle.fontWeight,
      frameClassName: preset.frameClassName,
      presetId: preset.id,
      textAlign: preset.defaultStyle.textAlign,
      textColor: preset.defaultStyle.textColor,
    }

    setProject((currentProject) => ({
      ...currentProject,
      layers: [...currentProject.layers, nextLayer],
    }))
    setActiveTool("text")
    setSelectedItemId(layerId)
  }

  const updateTextLayerContent = (layerId: string, content: string) => {
    setProject((currentProject) => ({
      ...currentProject,
      layers: currentProject.layers.map((layer) =>
        layer.id === layerId && layer.kind === "text" ? { ...layer, content } : layer
      ),
    }))
  }

  const updateTextLayerStyle = (
    layerId: string,
    style: Partial<
      Pick<
        StudioCanvasLayer,
        | "animationBy"
        | "animationDuration"
        | "animationName"
        | "backgroundColor"
        | "backgroundRadius"
        | "backgroundStyle"
        | "boxWidth"
        | "fontFamily"
        | "fontSize"
        | "fontStyle"
        | "fontWeight"
        | "textAlign"
        | "textColor"
      >
    >
  ) => {
    setProject((currentProject) => ({
      ...currentProject,
      layers: currentProject.layers.map((layer) =>
        layer.id === layerId && layer.kind === "text" ? { ...layer, ...style } : layer
      ),
    }))
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
    addTextLayerFromPreset,
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
    updateTextLayerContent,
    updateTextLayerStyle,
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
