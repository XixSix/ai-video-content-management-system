"use client"

import { createContext, useContext, useState } from "react"

import {
  getStudioSelectionById,
  studioEditorProject,
  studioTextPresets,
  studioToolPanels,
} from "./studio.data"
import {
  DEFAULT_CAPTION_STROKE_WIDTH,
  studioCaptionPresets,
} from "./studio-caption-presets"
import {
  rebuildTranscriptMeta,
  rebuildTranscriptSegmentsFromWords,
} from "./studio-captions"
import type {
  StudioCanvasLayer,
  StudioEditorProject,
  StudioSelection,
  StudioStaleOutputType,
  StudioTranscript,
  StudioTranscriptSegment,
  StudioTranscriptWord,
  StudioToolId,
} from "./studio.types"

function clampTime(timeSeconds: number, durationSeconds: number) {
  return Math.min(durationSeconds, Math.max(0, timeSeconds))
}

type StudioEditorContextValue = {
  activeTool: StudioToolId
  addChapterToEnd: () => void
  canRedo: boolean
  canUndo: boolean
  currentTime: number
  discardTranscriptChanges: () => void
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
  commitTranscriptWordText: (wordId: string, text: string) => void
  markTranscriptDirty: () => void
  saveTranscriptMock: () => void
  seekToTime: (timeSeconds: number) => void
  setActiveTool: (toolId: StudioToolId) => void
  setSelectedItemId: (selectionId: string) => void
  selectChapter: (chapterId: string) => void
  selectClipCandidate: (clipCandidateId: string) => void
  selectTranscriptSegment: (segmentId: string) => void
  toolPanel: (typeof studioToolPanels)[StudioToolId]
  redoEditorChange: () => void
  undoEditorChange: () => void
  applyCaptionPreset: (presetId: string) => void
  updateChapterTiming: (
    chapterId: string,
    timing: {
      endTime?: number
      startTime?: number
    }
  ) => void
  updateChapterTitle: (chapterId: string, title: string) => void
  updateTranscriptWordText: (wordId: string, text: string) => void
  updateCaptionLayerStyle: (
    style: Partial<
      Pick<
        StudioCanvasLayer,
        | "animationBy"
        | "animationDuration"
        | "animationName"
        | "backgroundEnabled"
        | "backgroundColor"
        | "backgroundRadius"
        | "enabled"
        | "fontFamily"
        | "fontSize"
        | "fontStyle"
        | "fontWeight"
        | "highlightColor"
        | "highlightEnabled"
        | "presetId"
        | "shadowEnabled"
        | "shadowStyle"
        | "strokeColor"
        | "strokeEnabled"
        | "strokeWidth"
        | "textColor"
        | "textDecoration"
        | "textTransform"
      >
    >
  ) => void
  updateTextLayerContent: (layerId: string, content: string) => void
  updateTextLayerStyle: (
    layerId: string,
    style: Partial<
      Pick<
        StudioCanvasLayer,
        | "animationBy"
        | "animationDuration"
        | "animationName"
        | "backgroundEnabled"
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

type SavedTranscriptState = {
  transcript: StudioTranscript
  transcriptSegments: StudioTranscriptSegment[]
  transcriptWords: StudioTranscriptWord[]
}

type StudioHistorySnapshot = {
  hasUnsavedTranscriptChanges: boolean
  project: StudioEditorProject
  savedTranscriptState: SavedTranscriptState
}

const MAX_HISTORY_SNAPSHOTS = 50

function cloneSavedTranscriptState(project: StudioEditorProject): SavedTranscriptState {
  return {
    transcript: { ...project.transcript },
    transcriptSegments: project.transcriptSegments.map((segment) => ({ ...segment })),
    transcriptWords: project.transcriptWords.map((word) => ({ ...word })),
  }
}

function cloneSavedTranscriptSnapshot(state: SavedTranscriptState): SavedTranscriptState {
  return {
    transcript: { ...state.transcript },
    transcriptSegments: state.transcriptSegments.map((segment) => ({ ...segment })),
    transcriptWords: state.transcriptWords.map((word) => ({ ...word })),
  }
}

function cloneProject(project: StudioEditorProject): StudioEditorProject {
  return {
    ...project,
    media: { ...project.media },
    projectMedia: project.projectMedia.map((item) => ({ ...item })),
    transcript: { ...project.transcript },
    transcriptSegments: project.transcriptSegments.map((segment) => ({ ...segment })),
    transcriptWords: project.transcriptWords.map((word) => ({ ...word })),
    chapters: project.chapters.map((chapter) => ({ ...chapter })),
    clipCandidates: project.clipCandidates.map((clipCandidate) => ({ ...clipCandidate })),
    shortClips: project.shortClips.map((shortClip) => ({ ...shortClip })),
    generatedAssets: project.generatedAssets.map((asset) => ({ ...asset })),
    processingJobs: project.processingJobs.map((job) => ({ ...job })),
    sourceMedia: { ...project.sourceMedia },
    layers: project.layers.map((layer) => ({ ...layer })),
    timelineTracks: project.timelineTracks.map((track) => ({
      ...track,
      segments: track.segments.map((segment) => ({ ...segment })),
    })),
  }
}

const StudioEditorContext = createContext<StudioEditorContextValue | null>(null)

export function StudioEditorProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [project, setProject] = useState<StudioEditorProject>(studioEditorProject)
  const [savedTranscriptState, setSavedTranscriptState] = useState<SavedTranscriptState>(() =>
    cloneSavedTranscriptState(studioEditorProject)
  )
  const [historyPast, setHistoryPast] = useState<StudioHistorySnapshot[]>([])
  const [historyFuture, setHistoryFuture] = useState<StudioHistorySnapshot[]>([])
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

  const createHistorySnapshot = (): StudioHistorySnapshot => ({
    hasUnsavedTranscriptChanges,
    project: cloneProject(project),
    savedTranscriptState: cloneSavedTranscriptSnapshot(savedTranscriptState),
  })

  const recordEditorHistory = () => {
    const snapshot = createHistorySnapshot()

    setHistoryPast((currentHistory) => [
      ...currentHistory.slice(-(MAX_HISTORY_SNAPSHOTS - 1)),
      snapshot,
    ])
    setHistoryFuture([])
  }

  const undoEditorChange = () => {
    const previousSnapshot = historyPast.at(-1)

    if (!previousSnapshot) {
      return
    }

    setHistoryFuture((currentHistory) => [createHistorySnapshot(), ...currentHistory])
    setHistoryPast((currentHistory) => currentHistory.slice(0, -1))
    setProject(cloneProject(previousSnapshot.project))
    setSavedTranscriptState(
      cloneSavedTranscriptSnapshot(previousSnapshot.savedTranscriptState)
    )
    setHasUnsavedTranscriptChanges(previousSnapshot.hasUnsavedTranscriptChanges)
  }

  const redoEditorChange = () => {
    const nextSnapshot = historyFuture[0]

    if (!nextSnapshot) {
      return
    }

    setHistoryPast((currentHistory) => [
      ...currentHistory.slice(-(MAX_HISTORY_SNAPSHOTS - 1)),
      createHistorySnapshot(),
    ])
    setHistoryFuture((currentHistory) => currentHistory.slice(1))
    setProject(cloneProject(nextSnapshot.project))
    setSavedTranscriptState(cloneSavedTranscriptSnapshot(nextSnapshot.savedTranscriptState))
    setHasUnsavedTranscriptChanges(nextSnapshot.hasUnsavedTranscriptChanges)
  }

  const seekToTime = (timeSeconds: number) => {
    setCurrentTime(clampTime(timeSeconds, project.media.durationSeconds))
  }

  const addChapterToEnd = () => {
    const lastChapter = [...project.chapters].sort(
      (left, right) => left.endTime - right.endTime
    ).at(-1)
    const nextStartTime = lastChapter?.endTime ?? 0

    if (nextStartTime >= project.media.durationSeconds) {
      return
    }

    recordEditorHistory()

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

    setProject((currentProject) => ({
      ...currentProject,
      chapters: [...currentProject.chapters, nextChapter],
    }))
    setActiveTool("chapters")
    setSelectedChapterId(nextChapterId)
    setSelectedTranscriptSegmentId(null)
    setSelectedClipCandidateId(null)
    setCurrentTime(nextStartTime)
  }

  const addTextLayerFromPreset = (presetId: string) => {
    const preset = studioTextPresets.find((item) => item.id === presetId)

    if (!preset) {
      return
    }

    recordEditorHistory()

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
    const layer = project.layers.find((item) => item.id === layerId)

    if (!layer || layer.kind !== "text" || layer.content === content) {
      return
    }

    recordEditorHistory()

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
    recordEditorHistory()

    setProject((currentProject) => ({
      ...currentProject,
      layers: currentProject.layers.map((layer) =>
        layer.id === layerId && layer.kind === "text" ? { ...layer, ...style } : layer
      ),
    }))
  }

  const updateCaptionLayerStyle = (
    style: Partial<
      Pick<
        StudioCanvasLayer,
        | "animationBy"
        | "animationDuration"
        | "animationName"
        | "backgroundColor"
        | "backgroundRadius"
        | "enabled"
        | "fontFamily"
        | "fontSize"
        | "fontStyle"
        | "fontWeight"
        | "highlightColor"
        | "highlightEnabled"
        | "presetId"
        | "shadowEnabled"
        | "shadowStyle"
        | "strokeColor"
        | "strokeEnabled"
        | "strokeWidth"
        | "textColor"
        | "textDecoration"
        | "textTransform"
      >
    >
  ) => {
    const captionLayer = project.layers.find((layer) => layer.kind === "captions")

    if (!captionLayer) {
      return
    }

    const normalizedStyle =
      style.strokeEnabled === true &&
      style.strokeWidth === undefined &&
      !captionLayer.strokeWidth
        ? {
            ...style,
            strokeWidth: DEFAULT_CAPTION_STROKE_WIDTH,
          }
        : style

    recordEditorHistory()

    setProject((currentProject) => ({
      ...currentProject,
      layers: currentProject.layers.map((layer) =>
        layer.kind === "captions" ? { ...layer, ...normalizedStyle } : layer
      ),
    }))
  }

  const applyCaptionPreset = (presetId: string) => {
    const preset = studioCaptionPresets.find((item) => item.id === presetId)
    const captionLayer = project.layers.find((layer) => layer.kind === "captions")

    if (!preset || !captionLayer) {
      return
    }

    const isUnchanged = Object.entries(preset.style).every(([key, value]) => {
      return captionLayer[key as keyof typeof preset.style] === value
    })

    if (isUnchanged) {
      return
    }

    recordEditorHistory()

    setProject((currentProject) => ({
      ...currentProject,
      layers: currentProject.layers.map((layer) =>
        layer.kind === "captions" ? { ...layer, ...preset.style, presetId } : layer
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

  const updateChapterTitle = (chapterId: string, title: string) => {
    const nextTitle = title
    const chapter = project.chapters.find((item) => item.id === chapterId)

    if (!chapter || chapter.title === nextTitle) {
      return
    }

    recordEditorHistory()

    setProject((currentProject) => ({
      ...currentProject,
      chapters: currentProject.chapters.map((item) =>
        item.id === chapterId ? { ...item, title: nextTitle } : item
      ),
    }))
  }

  const updateChapterTiming = (
    chapterId: string,
    timing: {
      endTime?: number
      startTime?: number
    }
  ) => {
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

    recordEditorHistory()

    setProject((currentProject) => ({
      ...currentProject,
      chapters: currentProject.chapters.map((item) =>
        item.id === chapterId
          ? {
              ...item,
              startTime: nextStartTime,
              endTime: nextEndTime,
            }
          : item
      ),
    }))

    if (selectedChapterId === chapterId) {
      setCurrentTime((currentTimeValue) =>
        clampTime(currentTimeValue, nextEndTime)
      )
    }
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

  const updateTranscriptWordText = (wordId: string, text: string) => {
    const word = project.transcriptWords.find((item) => item.id === wordId)

    if (!word || word.text === text) {
      return
    }

    recordEditorHistory()

    setProject((currentProject) => ({
      ...currentProject,
      transcriptWords: currentProject.transcriptWords.map((word) =>
        word.id === wordId ? { ...word, text } : word
      ),
    }))
    setHasUnsavedTranscriptChanges(true)
  }

  const commitTranscriptWordText = (wordId: string, text: string) => {
    const nextText = text.trim()
    const currentWord = project.transcriptWords.find((word) => word.id === wordId)

    if (!currentWord || currentWord.text === nextText) {
      return
    }

    recordEditorHistory()

    const transcriptWords = project.transcriptWords.map((word) =>
      word.id === wordId ? { ...word, text: nextText } : word
    )
    const transcriptSegments = rebuildTranscriptSegmentsFromWords(
      project.transcriptSegments,
      transcriptWords
    )
    const transcript = {
      ...rebuildTranscriptMeta(project.transcript, transcriptSegments, transcriptWords),
      version: project.transcript.version + 1,
    }
    const nextProject = {
      ...project,
      transcript,
      transcriptSegments,
      transcriptWords,
    }

    setProject(nextProject)
    setSavedTranscriptState(cloneSavedTranscriptState(nextProject))

    setHasUnsavedTranscriptChanges(false)
  }

  const discardTranscriptChanges = () => {
    if (!hasUnsavedTranscriptChanges) {
      return
    }

    recordEditorHistory()

    setProject((currentProject) => ({
      ...currentProject,
      transcript: { ...savedTranscriptState.transcript },
      transcriptSegments: savedTranscriptState.transcriptSegments.map((segment) => ({
        ...segment,
      })),
      transcriptWords: savedTranscriptState.transcriptWords.map((word) => ({ ...word })),
    }))
    setHasUnsavedTranscriptChanges(false)
  }

  const saveTranscriptMock = () => {
    recordEditorHistory()

    const transcriptSegments = rebuildTranscriptSegmentsFromWords(
      project.transcriptSegments,
      project.transcriptWords
    )
    const transcript = {
      ...rebuildTranscriptMeta(project.transcript, transcriptSegments, project.transcriptWords),
      version: project.transcript.version + 1,
    }
    const nextProject = {
      ...project,
      transcript,
      transcriptSegments,
    }

    setProject(nextProject)
    setSavedTranscriptState(cloneSavedTranscriptState(nextProject))

    setHasUnsavedTranscriptChanges(false)
  }

  const value: StudioEditorContextValue = {
    addTextLayerFromPreset,
    activeTool,
    addChapterToEnd,
    applyCaptionPreset,
    canRedo: historyFuture.length > 0,
    canUndo: historyPast.length > 0,
    commitTranscriptWordText,
    currentTime,
    discardTranscriptChanges,
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
    redoEditorChange,
    undoEditorChange,
    updateChapterTiming,
    updateChapterTitle,
    updateCaptionLayerStyle,
    updateTranscriptWordText,
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
