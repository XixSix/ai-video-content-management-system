"use client"

import { createContext, useCallback, useContext, useState } from "react"

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
  StudioClipCandidate,
  StudioClipCandidateStatus,
  StudioShortClip,
  StudioCanvasLayer,
  StudioEditorProject,
  StudioProjectMediaItem,
  StudioTimelineSegment,
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

function getWidthPercentFromClassName(widthClassName: string) {
  const arbitraryWidthMatch = widthClassName.match(/w-\[(\d+(?:\.\d+)?)%\]/)

  if (!arbitraryWidthMatch) {
    return null
  }

  return Number(arbitraryWidthMatch[1])
}

function getTimelineWidthClassName(durationSeconds: number, projectDurationSeconds: number) {
  const widthPercent =
    projectDurationSeconds > 0 ? (durationSeconds / projectDurationSeconds) * 100 : 0

  return `w-[${Number(widthPercent.toFixed(2))}%]`
}

function getTimelineSegmentDuration({
  media,
  projectDurationSeconds,
  segment,
}: {
  media: StudioProjectMediaItem | null
  projectDurationSeconds: number
  segment: StudioTimelineSegment
}) {
  const widthPercent = getWidthPercentFromClassName(segment.widthClassName)
  const widthDuration =
    widthPercent !== null ? (widthPercent / 100) * projectDurationSeconds : null

  return Math.max(
    0,
    segment.durationSeconds ??
      media?.durationSeconds ??
      widthDuration ??
      projectDurationSeconds
  )
}

function getProjectTimelineDuration(project: StudioEditorProject) {
  const segmentEndTimes = project.timelineTracks.flatMap((track) =>
    track.segments.map((segment) => {
      const segmentMedia =
        segment.selectionId === project.sourceMedia.id
          ? project.projectMedia.find(
              (item) =>
                item.linkedSelectionId === project.sourceMedia.id ||
                item.origin === "SOURCE"
            ) ?? null
          : project.projectMedia.find(
              (item) => item.linkedSelectionId === segment.selectionId
            ) ?? null
      const startTime = Math.max(0, segment.startTime ?? segmentMedia?.startTime ?? 0)
      const durationSeconds = getTimelineSegmentDuration({
        media: segmentMedia,
        projectDurationSeconds: project.media.durationSeconds,
        segment,
      })

      return startTime + durationSeconds
    })
  )

  return Math.max(project.media.durationSeconds, ...segmentEndTimes)
}

function getTimelineSegmentStartTime({
  media,
  segment,
}: {
  media: StudioProjectMediaItem | null
  segment: StudioTimelineSegment
}) {
  return Math.max(0, segment.startTime ?? media?.startTime ?? 0)
}

function getTimelineSegmentEndTime({
  media,
  projectDurationSeconds,
  segment,
}: {
  media: StudioProjectMediaItem | null
  projectDurationSeconds: number
  segment: StudioTimelineSegment
}) {
  return (
    getTimelineSegmentStartTime({ media, segment }) +
    getTimelineSegmentDuration({
      media,
      projectDurationSeconds,
      segment,
    })
  )
}

type StudioEditorContextValue = {
  activeTool: StudioToolId
  addChapterToEnd: () => void
  canRedo: boolean
  canUndo: boolean
  currentTime: number
  createDraftClipFromCandidate: (clipCandidateId: string) => void
  deleteTimelineSegment: (segmentId: string) => void
  discardTranscriptChanges: () => void
  duplicateTimelineSegment: (segmentId: string) => void
  hasStaleAssets: boolean
  hasStaleChapters: boolean
  hasStaleClips: boolean
  hasUnsavedTranscriptChanges: boolean
  isPlaying: boolean
  mutedTrackIds: string[]
  pausePlayback: () => void
  playPlayback: () => void
  project: StudioEditorProject
  selectedChapterId: string | null
  selectedClipCandidateId: string | null
  selectedShortClipId: string | null
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
  setClipCandidateStatus: (
    clipCandidateId: string,
    status: StudioClipCandidateStatus
  ) => void
  setSelectedItemId: (selectionId: string) => void
  togglePlayback: () => void
  toggleTrackMute: (trackId: string) => void
  selectChapter: (chapterId: string) => void
  selectClipCandidate: (clipCandidateId: string) => void
  selectShortClip: (shortClipId: string) => void
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
  updateTimelineSegmentTiming: (
    segmentId: string,
    timing: {
      durationSeconds: number
      startTime: number
    }
  ) => void
  updateClipCandidateDetails: (
    clipCandidateId: string,
    details: Partial<
      Pick<
        StudioClipCandidate,
        "aspectRatio" | "burnSubtitles" | "caption" | "platform" | "title"
      >
    >
  ) => void
  updateClipCandidateTiming: (
    clipCandidateId: string,
    timing: {
      endTime?: number
      startTime?: number
    }
  ) => void
  updateTranscriptWordText: (wordId: string, text: string) => void
  updateShortClipDetails: (
    shortClipId: string,
    details: Partial<
      Pick<
        StudioShortClip,
        "aspectRatio" | "burnSubtitles" | "caption" | "platform" | "status" | "title"
      >
    >
  ) => void
  updateShortClipTiming: (
    shortClipId: string,
    timing: {
      endTime?: number
      startTime?: number
    }
  ) => void
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
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedTranscriptSegmentId, setSelectedTranscriptSegmentId] = useState<string | null>(
    null
  )
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [selectedClipCandidateId, setSelectedClipCandidateId] = useState<string | null>(null)
  const [selectedShortClipId, setSelectedShortClipId] = useState<string | null>(null)
  const [hasUnsavedTranscriptChanges, setHasUnsavedTranscriptChanges] = useState(false)
  const [mutedTrackIds, setMutedTrackIds] = useState<string[]>([])
  const selectedItem = getStudioSelectionById(project, selectedItemId)
  const timelineDurationSeconds = getProjectTimelineDuration(project)
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

  const playPlayback = useCallback(() => {
    setCurrentTime((currentTimeValue) =>
      currentTimeValue >= timelineDurationSeconds
        ? 0
        : clampTime(currentTimeValue, timelineDurationSeconds)
    )
    setIsPlaying(true)
  }, [timelineDurationSeconds])

  const pausePlayback = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pausePlayback()
      return
    }

    playPlayback()
  }, [isPlaying, pausePlayback, playPlayback])

  const seekToTime = useCallback((timeSeconds: number) => {
    const nextTime = clampTime(timeSeconds, timelineDurationSeconds)

    setCurrentTime(nextTime)

    if (nextTime >= timelineDurationSeconds) {
      setIsPlaying(false)
    }
  }, [timelineDurationSeconds])

  const toggleTrackMute = useCallback((trackId: string) => {
    setMutedTrackIds((currentMutedTrackIds) =>
      currentMutedTrackIds.includes(trackId)
        ? currentMutedTrackIds.filter((mutedTrackId) => mutedTrackId !== trackId)
        : [...currentMutedTrackIds, trackId]
    )
  }, [])

  const updateTimelineSegmentTiming = useCallback(
    (
      segmentId: string,
      timing: {
        durationSeconds: number
        startTime: number
      }
    ) => {
      const durationSeconds = Math.max(0.25, timing.durationSeconds)

      setProject((currentProject) => ({
        ...currentProject,
        timelineTracks: currentProject.timelineTracks.map((track) => ({
          ...track,
          segments: track.segments.map((segment) =>
            segment.id === segmentId
              ? {
                  ...segment,
                  durationSeconds,
                  startTime: Math.max(0, timing.startTime),
                  widthClassName: getTimelineWidthClassName(
                    durationSeconds,
                    currentProject.media.durationSeconds
                  ),
                }
              : segment
          ),
        })),
      }))
    },
    []
  )

  const deleteTimelineSegment = (segmentId: string) => {
    const track = project.timelineTracks.find((track) =>
      track.segments.some((segment) => segment.id === segmentId)
    )

    if (!track) {
      return
    }

    recordEditorHistory()

    setProject((currentProject) => ({
      ...currentProject,
      timelineTracks: currentProject.timelineTracks.map((track) => ({
        ...track,
        segments: track.segments.filter((segment) => segment.id !== segmentId),
      })),
    }))

    if (selectedItemId === segmentId) {
      setSelectedItemId(project.sourceMedia.id)
    }
  }

  const duplicateTimelineSegment = (segmentId: string) => {
    const sourceTrack = project.timelineTracks.find((track) =>
      track.segments.some((segment) => segment.id === segmentId)
    )
    const sourceSegment = sourceTrack?.segments.find((segment) => segment.id === segmentId)

    if (!sourceTrack || !sourceSegment) {
      return
    }

    recordEditorHistory()

    const nextSegmentId = `${sourceSegment.id}-copy-${Date.now()}`
    const sourceMedia =
      sourceSegment.selectionId === project.sourceMedia.id
        ? project.projectMedia.find(
            (item) =>
              item.linkedSelectionId === project.sourceMedia.id ||
              item.origin === "SOURCE"
          ) ?? null
        : project.projectMedia.find(
            (item) => item.linkedSelectionId === sourceSegment.selectionId
          ) ?? null
    const estimatedSegmentDuration = Math.max(
      0.25,
      getTimelineSegmentDuration({
        media: sourceMedia,
        projectDurationSeconds: project.media.durationSeconds,
        segment: sourceSegment,
      })
    )
    const sourceEndTime = getTimelineSegmentEndTime({
      media: sourceMedia,
      projectDurationSeconds: project.media.durationSeconds,
      segment: sourceSegment,
    })
    const occupiedSegments = sourceTrack.segments
      .filter((segment) => segment.id !== sourceSegment.id)
      .map((segment) => {
        const segmentMedia =
          segment.selectionId === project.sourceMedia.id
            ? project.projectMedia.find(
                (item) =>
                  item.linkedSelectionId === project.sourceMedia.id ||
                  item.origin === "SOURCE"
              ) ?? null
            : project.projectMedia.find(
                (item) => item.linkedSelectionId === segment.selectionId
              ) ?? null
        const startTime = getTimelineSegmentStartTime({
          media: segmentMedia,
          segment,
        })

        return {
          endTime: getTimelineSegmentEndTime({
            media: segmentMedia,
            projectDurationSeconds: project.media.durationSeconds,
            segment,
          }),
          laneIndex: segment.laneIndex ?? 0,
          startTime,
        }
      })
      .sort((left, right) => left.startTime - right.startTime)
    const nextStartTime = Math.max(0, sourceEndTime)
    const nextEndTime = nextStartTime + estimatedSegmentDuration
    let nextLaneIndex = sourceSegment.laneIndex ?? 0

    while (
      occupiedSegments.some(
        (occupiedSegment) =>
          occupiedSegment.laneIndex === nextLaneIndex &&
          nextStartTime < occupiedSegment.endTime &&
          nextEndTime > occupiedSegment.startTime
      )
    ) {
      nextLaneIndex += 1
    }

    const sourceSegmentIndex = sourceTrack.segments.findIndex(
      (segment) => segment.id === segmentId
    )
    const sourceLabel = sourceSegment.label.replace(/(?: copy)+$/i, "")
    const nextSegment = {
      ...sourceSegment,
      id: nextSegmentId,
      durationSeconds: estimatedSegmentDuration,
      laneIndex: nextLaneIndex,
      label: `${sourceLabel} copy`,
      offsetClassName:
        sourceTrack.id === "video" || sourceTrack.id === "audio"
          ? sourceSegment.offsetClassName
          : undefined,
      startTime: nextStartTime,
    }

    setProject((currentProject) => ({
      ...currentProject,
      timelineTracks: currentProject.timelineTracks.map((track) =>
        track.id === sourceTrack.id
          ? {
              ...track,
              segments: [
                ...track.segments.slice(0, sourceSegmentIndex + 1),
                nextSegment,
                ...track.segments.slice(sourceSegmentIndex + 1),
              ],
            }
          : track
      ),
    }))

    setSelectedItemId(nextSegmentId)
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
    setSelectedShortClipId(null)
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
    setSelectedShortClipId(null)
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
    setSelectedShortClipId(null)
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
    setSelectedShortClipId(null)
    setSelectedTranscriptSegmentId(null)
    setSelectedChapterId(null)
    setSelectedItemId(project.sourceMedia.id)
    setCurrentTime(clipCandidate.startTime)
  }

  const selectShortClip = (shortClipId: string) => {
    const shortClip = project.shortClips.find((item) => item.id === shortClipId)

    if (!shortClip) {
      return
    }

    setActiveTool("clips")
    setSelectedShortClipId(shortClipId)
    setSelectedClipCandidateId(null)
    setSelectedTranscriptSegmentId(null)
    setSelectedChapterId(null)
    setSelectedItemId(project.sourceMedia.id)
    setCurrentTime(shortClip.startTime)
  }

  const setClipCandidateStatus = (
    clipCandidateId: string,
    status: StudioClipCandidateStatus
  ) => {
    const clipCandidate = project.clipCandidates.find((item) => item.id === clipCandidateId)

    if (!clipCandidate || clipCandidate.status === status) {
      return
    }

    recordEditorHistory()

    setProject((currentProject) => ({
      ...currentProject,
      clipCandidates: currentProject.clipCandidates.map((item) =>
        item.id === clipCandidateId ? { ...item, status } : item
      ),
    }))
  }

  const updateClipCandidateDetails = (
    clipCandidateId: string,
    details: Partial<
      Pick<
        StudioClipCandidate,
        "aspectRatio" | "burnSubtitles" | "caption" | "platform" | "title"
      >
    >
  ) => {
    const clipCandidate = project.clipCandidates.find((item) => item.id === clipCandidateId)

    if (!clipCandidate) {
      return
    }

    const hasChanges = Object.entries(details).some(([key, value]) => {
      return clipCandidate[key as keyof typeof details] !== value
    })

    if (!hasChanges) {
      return
    }

    recordEditorHistory()

    setProject((currentProject) => ({
      ...currentProject,
      clipCandidates: currentProject.clipCandidates.map((item) =>
        item.id === clipCandidateId ? { ...item, ...details } : item
      ),
    }))
  }

  const updateClipCandidateTiming = (
    clipCandidateId: string,
    timing: {
      endTime?: number
      startTime?: number
    }
  ) => {
    const clipCandidate = project.clipCandidates.find((item) => item.id === clipCandidateId)

    if (!clipCandidate) {
      return
    }

    const minimumClipDurationSeconds = project.media.durationSeconds >= 1 ? 1 : 0
    const startTimeLimit = Math.max(0, clipCandidate.endTime - minimumClipDurationSeconds)
    const nextStartTime =
      typeof timing.startTime === "number"
        ? clampTime(timing.startTime, startTimeLimit)
        : clipCandidate.startTime
    const endTimeFloor = Math.min(
      project.media.durationSeconds,
      nextStartTime + minimumClipDurationSeconds
    )
    const nextEndTime =
      typeof timing.endTime === "number"
        ? Math.max(
            endTimeFloor,
            clampTime(timing.endTime, project.media.durationSeconds)
          )
        : clipCandidate.endTime
    const nextDuration = Number(Math.max(0, nextEndTime - nextStartTime).toFixed(2))

    if (
      nextStartTime === clipCandidate.startTime &&
      nextEndTime === clipCandidate.endTime &&
      nextDuration === clipCandidate.duration
    ) {
      return
    }

    recordEditorHistory()

    setProject((currentProject) => ({
      ...currentProject,
      clipCandidates: currentProject.clipCandidates.map((item) =>
        item.id === clipCandidateId
          ? {
              ...item,
              startTime: nextStartTime,
              endTime: nextEndTime,
              duration: nextDuration,
            }
          : item
      ),
    }))

    if (selectedClipCandidateId === clipCandidateId) {
      setCurrentTime((currentTimeValue) => clampTime(currentTimeValue, nextEndTime))
    }
  }

  const updateShortClipDetails = (
    shortClipId: string,
    details: Partial<
      Pick<
        StudioShortClip,
        "aspectRatio" | "burnSubtitles" | "caption" | "platform" | "status" | "title"
      >
    >
  ) => {
    const shortClip = project.shortClips.find((item) => item.id === shortClipId)

    if (!shortClip) {
      return
    }

    const hasChanges = Object.entries(details).some(([key, value]) => {
      return shortClip[key as keyof typeof details] !== value
    })

    if (!hasChanges) {
      return
    }

    recordEditorHistory()

    setProject((currentProject) => ({
      ...currentProject,
      shortClips: currentProject.shortClips.map((item) =>
        item.id === shortClipId ? { ...item, ...details } : item
      ),
    }))
  }

  const updateShortClipTiming = (
    shortClipId: string,
    timing: {
      endTime?: number
      startTime?: number
    }
  ) => {
    const shortClip = project.shortClips.find((item) => item.id === shortClipId)

    if (!shortClip) {
      return
    }

    const minimumClipDurationSeconds = project.media.durationSeconds >= 1 ? 1 : 0
    const startTimeLimit = Math.max(0, shortClip.endTime - minimumClipDurationSeconds)
    const nextStartTime =
      typeof timing.startTime === "number"
        ? clampTime(timing.startTime, startTimeLimit)
        : shortClip.startTime
    const endTimeFloor = Math.min(
      project.media.durationSeconds,
      nextStartTime + minimumClipDurationSeconds
    )
    const nextEndTime =
      typeof timing.endTime === "number"
        ? Math.max(
            endTimeFloor,
            clampTime(timing.endTime, project.media.durationSeconds)
          )
        : shortClip.endTime
    const nextDuration = Number(Math.max(0, nextEndTime - nextStartTime).toFixed(2))

    if (
      nextStartTime === shortClip.startTime &&
      nextEndTime === shortClip.endTime &&
      nextDuration === shortClip.duration
    ) {
      return
    }

    recordEditorHistory()

    setProject((currentProject) => ({
      ...currentProject,
      shortClips: currentProject.shortClips.map((item) =>
        item.id === shortClipId
          ? {
              ...item,
              startTime: nextStartTime,
              endTime: nextEndTime,
              duration: nextDuration,
            }
          : item
      ),
    }))

    if (selectedShortClipId === shortClipId) {
      setCurrentTime((currentTimeValue) => clampTime(currentTimeValue, nextEndTime))
    }
  }

  const createDraftClipFromCandidate = (clipCandidateId: string) => {
    const clipCandidate = project.clipCandidates.find((item) => item.id === clipCandidateId)

    if (!clipCandidate) {
      return
    }

    const existingDraft = project.shortClips.find(
      (item) => item.sourceCandidateId === clipCandidateId
    )
    const nextClipId = existingDraft?.id ?? `short_clip_${Date.now()}`
    const nextDraft: StudioShortClip = {
      id: nextClipId,
      sourceCandidateId: clipCandidateId,
      title: clipCandidate.title,
      caption: clipCandidate.caption,
      startTime: clipCandidate.startTime,
      endTime: clipCandidate.endTime,
      duration: clipCandidate.duration,
      status: "DRAFT",
      videoPath: `short-clips/launch-keynote/${nextClipId}.mp4`,
      thumbnailPath: `short-clips/launch-keynote/${nextClipId}.jpg`,
      aspectRatio: clipCandidate.aspectRatio,
      platform: clipCandidate.platform,
      burnSubtitles: clipCandidate.burnSubtitles,
      transcriptVersion: project.transcript.version,
    }

    recordEditorHistory()

    setProject((currentProject) => ({
      ...currentProject,
      clipCandidates: currentProject.clipCandidates.map((item) =>
        item.id === clipCandidateId ? { ...item, status: "SELECTED" } : item
      ),
      shortClips: existingDraft
        ? currentProject.shortClips.map((item) =>
            item.id === existingDraft.id ? nextDraft : item
          )
        : [nextDraft, ...currentProject.shortClips],
    }))

    setActiveTool("clips")
    setSelectedShortClipId(nextClipId)
    setSelectedClipCandidateId(null)
    setSelectedTranscriptSegmentId(null)
    setSelectedChapterId(null)
    setSelectedItemId(project.sourceMedia.id)
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
    createDraftClipFromCandidate,
    deleteTimelineSegment,
    discardTranscriptChanges,
    duplicateTimelineSegment,
    hasStaleAssets,
    hasStaleChapters,
    hasStaleClips,
    hasUnsavedTranscriptChanges,
    isPlaying,
    markTranscriptDirty,
    mutedTrackIds,
    pausePlayback,
    playPlayback,
    project,
    saveTranscriptMock,
    seekToTime,
    selectChapter,
    selectClipCandidate,
    selectShortClip,
    selectedChapterId,
    selectedClipCandidateId,
    selectedShortClipId,
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
    setClipCandidateStatus,
    setSelectedItemId,
    togglePlayback,
    toggleTrackMute,
    toolPanel: studioToolPanels[activeTool],
    redoEditorChange,
    undoEditorChange,
    updateChapterTiming,
    updateChapterTitle,
    updateClipCandidateDetails,
    updateClipCandidateTiming,
    updateCaptionLayerStyle,
    updateTranscriptWordText,
    updateShortClipDetails,
    updateShortClipTiming,
    updateTimelineSegmentTiming,
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
