"use client"

import type { StoreApi } from "zustand/vanilla"

import type {
  StudioAspectRatio,
  StudioCanvasLayer,
  StudioClipCandidate,
  StudioClipCandidateStatus,
  StudioEditorProject,
  StudioProjectMediaItem,
  StudioShortClip,
  StudioToolId,
} from "../studio.types"
import type { StudioEditorState } from "./studio-editor-state"

export type CaptionLayerStyleUpdate = Partial<
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

export type TextLayerStyleUpdate = Partial<
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
    | "xPercent"
    | "yPercent"
  >
>

export type ClipCandidateDetailsUpdate = Partial<
  Pick<
    StudioClipCandidate,
    "aspectRatio" | "burnSubtitles" | "caption" | "platform" | "title"
  >
>

export type ShortClipDetailsUpdate = Partial<
  Pick<
    StudioShortClip,
    "aspectRatio" | "burnSubtitles" | "caption" | "platform" | "status" | "title"
  >
>

export type StudioEditorActions = {
  addChapterToEnd: () => void
  addProjectMediaToTimeline: (mediaId: string) => void
  addTextLayerFromPreset: (presetId: string) => void
  applyCaptionPreset: (presetId: string) => void
  commitTranscriptWordText: (wordId: string, text: string) => void
  createDraftClipFromCandidate: (clipCandidateId: string) => void
  deleteTimelineSegment: (segmentId: string) => void
  discardTranscriptChanges: () => void
  duplicateTimelineSegment: (segmentId: string) => void
  markTranscriptDirty: () => void
  moveTimelineSegmentWithPush: (
    segmentId: string,
    startTime: number,
    options?: {
      baseProject?: StudioEditorProject
      recordHistory?: boolean
    }
  ) => void
  pausePlayback: () => void
  playPlayback: () => void
  redoEditorChange: () => void
  saveTranscriptMock: () => void
  seekToTime: (timeSeconds: number) => void
  selectChapter: (chapterId: string) => void
  selectClipCandidate: (clipCandidateId: string) => void
  selectShortClip: (shortClipId: string) => void
  selectTranscriptSegment: (segmentId: string) => void
  setActiveTool: (toolId: StudioToolId) => void
  setClipCandidateStatus: (
    clipCandidateId: string,
    status: StudioClipCandidateStatus
  ) => void
  setSelectedItemId: (selectionId: string) => void
  togglePlayback: () => void
  toggleTrackMute: (trackId: string) => void
  undoEditorChange: () => void
  removeProjectMedia: (mediaId: string) => void
  upsertProjectMedia: (media: StudioProjectMediaItem) => void
  updateCaptionLayerStyle: (style: CaptionLayerStyleUpdate) => void
  updateChapterTiming: (
    chapterId: string,
    timing: {
      endTime?: number
      startTime?: number
    }
  ) => void
  updateChapterTitle: (chapterId: string, title: string) => void
  updateClipCandidateDetails: (
    clipCandidateId: string,
    details: ClipCandidateDetailsUpdate
  ) => void
  updateClipCandidateTiming: (
    clipCandidateId: string,
    timing: {
      endTime?: number
      startTime?: number
    }
  ) => void
  updateShortClipDetails: (
    shortClipId: string,
    details: ShortClipDetailsUpdate
  ) => void
  updateShortClipTiming: (
    shortClipId: string,
    timing: {
      endTime?: number
      startTime?: number
    }
  ) => void
  updateProjectAspectRatio: (aspectRatio: StudioAspectRatio) => void
  updateTextLayerContent: (layerId: string, content: string) => void
  updateTextLayerPosition: (
    layerId: string,
    position: {
      xPercent: number
      yPercent: number
    },
    options?: {
      recordHistory?: boolean
    }
  ) => void
  updateTextLayerStyle: (layerId: string, style: TextLayerStyleUpdate) => void
  updateTimelineSegmentTiming: (
    segmentId: string,
    timing: {
      durationSeconds: number
      startTime: number
    }
  ) => void
  updateTranscriptWordText: (wordId: string, text: string) => void
}

export type StudioEditorStore = StudioEditorState & StudioEditorActions
export type StudioEditorStoreApi = StoreApi<StudioEditorStore>
export type StudioEditorGet = StudioEditorStoreApi["getState"]
export type StudioEditorSet = StudioEditorStoreApi["setState"]
