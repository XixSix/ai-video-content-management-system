"use client"

import { studioEditorProject } from "../data/project.mock"
import type {
  StudioEditorProject,
  StudioTranscript,
  StudioTranscriptSegment,
  StudioTranscriptWord,
  StudioToolId,
} from "../studio.types"

export type SavedTranscriptState = {
  transcript: StudioTranscript
  transcriptSegments: StudioTranscriptSegment[]
  transcriptWords: StudioTranscriptWord[]
}

export type StudioHistorySnapshot = {
  hasUnsavedTranscriptChanges: boolean
  project: StudioEditorProject
  savedTranscriptState: SavedTranscriptState
}

export type StudioEditorState = {
  activeTool: StudioToolId
  currentTime: number
  hasUnsavedTranscriptChanges: boolean
  historyFuture: StudioHistorySnapshot[]
  historyPast: StudioHistorySnapshot[]
  isPlaying: boolean
  mutedTrackIds: string[]
  project: StudioEditorProject
  savedTranscriptState: SavedTranscriptState
  selectedChapterId: string | null
  selectedClipCandidateId: string | null
  selectedItemId: string
  selectedShortClipId: string | null
  selectedTranscriptSegmentId: string | null
}

export const MAX_HISTORY_SNAPSHOTS = 50

export function clampTime(timeSeconds: number, durationSeconds: number) {
  return Math.min(durationSeconds, Math.max(0, timeSeconds))
}

export function cloneSavedTranscriptState(
  project: StudioEditorProject
): SavedTranscriptState {
  return {
    transcript: { ...project.transcript },
    transcriptSegments: project.transcriptSegments.map((segment) => ({ ...segment })),
    transcriptWords: project.transcriptWords.map((word) => ({ ...word })),
  }
}

export function cloneSavedTranscriptSnapshot(
  state: SavedTranscriptState
): SavedTranscriptState {
  return {
    transcript: { ...state.transcript },
    transcriptSegments: state.transcriptSegments.map((segment) => ({ ...segment })),
    transcriptWords: state.transcriptWords.map((word) => ({ ...word })),
  }
}

export function cloneProject(project: StudioEditorProject): StudioEditorProject {
  return {
    ...project,
    media: { ...project.media },
    projectMedia: project.projectMedia.map((item) => ({ ...item })),
    transcript: { ...project.transcript },
    transcriptSegments: project.transcriptSegments.map((segment) => ({ ...segment })),
    transcriptWords: project.transcriptWords.map((word) => ({ ...word })),
    chapters: project.chapters.map((chapter) => ({ ...chapter })),
    clipCandidates: project.clipCandidates.map((clipCandidate) => ({
      ...clipCandidate,
    })),
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

export function createHistorySnapshot(
  state: Pick<
    StudioEditorState,
    "hasUnsavedTranscriptChanges" | "project" | "savedTranscriptState"
  >
): StudioHistorySnapshot {
  return {
    hasUnsavedTranscriptChanges: state.hasUnsavedTranscriptChanges,
    project: cloneProject(state.project),
    savedTranscriptState: cloneSavedTranscriptSnapshot(state.savedTranscriptState),
  }
}

export function createInitialStudioEditorState(): StudioEditorState {
  return {
    activeTool: "media",
    currentTime: 0,
    hasUnsavedTranscriptChanges: false,
    historyFuture: [],
    historyPast: [],
    isPlaying: false,
    mutedTrackIds: [],
    project: studioEditorProject,
    savedTranscriptState: cloneSavedTranscriptState(studioEditorProject),
    selectedChapterId: null,
    selectedClipCandidateId: null,
    selectedItemId: "source-media",
    selectedShortClipId: null,
    selectedTranscriptSegmentId: null,
  }
}
