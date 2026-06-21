"use client"

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { useStore } from "zustand"
import { useShallow } from "zustand/react/shallow"
import { createStore } from "zustand/vanilla"

import { createChapterActions } from "./actions/chapter-actions"
import { createClipActions } from "./actions/clip-actions"
import { createHistoryActions } from "./actions/history-actions"
import { createLayerActions } from "./actions/layer-actions"
import { createPlaybackActions } from "./actions/playback-actions"
import { createProjectActions } from "./actions/project-actions"
import { createSelectionActions } from "./actions/selection-actions"
import { createTimelineActions } from "./actions/timeline-actions"
import { createToolActions } from "./actions/tool-actions"
import { createTranscriptActions } from "./actions/transcript-actions"
import { createInitialStudioEditorState } from "./studio-editor-state"
import {
  getSelectedItem,
  getSelectedTargetId,
  getStaleOutputState,
  getToolPanel,
} from "./studio-editor-selectors"
import type {
  StudioEditorActions,
  StudioEditorStore,
  StudioEditorStoreApi,
} from "./studio-editor-store.types"
import type { StudioEditorProject } from "../studio.types"

const StudioEditorStoreContext = createContext<StudioEditorStoreApi | null>(null)

const READ_ONLY_ACTIONS: Partial<StudioEditorActions> = {
  addChapterToEnd: () => undefined,
  addProjectMediaToTimeline: () => undefined,
  addTextLayerFromPreset: () => undefined,
  applyCaptionPreset: () => undefined,
  commitTranscriptWordText: () => undefined,
  createDraftClipFromCandidate: () => undefined,
  deleteTimelineSegment: () => undefined,
  discardTranscriptChanges: () => undefined,
  duplicateTimelineSegment: () => undefined,
  markTranscriptDirty: () => undefined,
  moveTimelineSegmentWithPush: () => undefined,
  redoEditorChange: () => undefined,
  removeProjectMedia: () => undefined,
  saveTranscriptMock: () => undefined,
  setProjectSource: () => undefined,
  setClipCandidateStatus: () => undefined,
  undoEditorChange: () => undefined,
  updateCanvasLayerPosition: () => undefined,
  updateCaptionLayerStyle: () => undefined,
  updateChapterTiming: () => undefined,
  updateChapterTitle: () => undefined,
  updateClipCandidateDetails: () => undefined,
  updateClipCandidateTiming: () => undefined,
  updateProjectAspectRatio: () => undefined,
  updateShortClipDetails: () => undefined,
  updateShortClipTiming: () => undefined,
  updateTextLayerContent: () => undefined,
  updateTextLayerStyle: () => undefined,
  updateTimelineSegmentTiming: () => undefined,
  updateTranscriptWordText: () => undefined,
  upsertProjectMedia: () => undefined,
}

export function createStudioEditorStore(
  initialProject: StudioEditorProject,
  canEdit: boolean
) {
  return createStore<StudioEditorStore>((set, get) => ({
    ...createInitialStudioEditorState(initialProject, canEdit),
    ...createToolActions(set),
    ...createPlaybackActions(set, get),
    ...createSelectionActions(set, get),
    ...(canEdit
      ? {
          ...createHistoryActions(set, get),
          ...createProjectActions(set, get),
          ...createTimelineActions(set, get),
          ...createLayerActions(set, get),
          ...createChapterActions(set, get),
          ...createClipActions(set, get),
          ...createTranscriptActions(set, get),
        }
      : (READ_ONLY_ACTIONS as StudioEditorActions)),
  }))
}

export function StudioEditorStoreProvider({
  children,
  initialProject,
  canEdit,
}: {
  children: ReactNode
  initialProject: StudioEditorProject
  canEdit: boolean
}) {
  const [store] = useState(() =>
    createStudioEditorStore(initialProject, canEdit)
  )

  return (
    <StudioEditorStoreContext.Provider value={store}>
      {children}
    </StudioEditorStoreContext.Provider>
  )
}

export function useStudioEditorStoreApi() {
  const store = useContext(StudioEditorStoreContext)

  if (!store) {
    throw new Error(
      "Studio editor store hooks must be used within StudioEditorStoreProvider."
    )
  }

  return store
}

function useStudioEditorStore<T>(selector: (state: StudioEditorStore) => T): T {
  const store = useStudioEditorStoreApi()

  return useStore(store, selector)
}

export function useStudioEditorPermission() {
  return useStudioEditorStore((state) => state.canEdit)
}

export function useStudioProjectState() {
  const project = useStudioEditorStore((state) => state.project)

  return {
    project,
    ...getStaleOutputState(project),
  }
}

export function useStudioProjectActions() {
  return useStudioEditorStore(
    useShallow((state) => ({
      addProjectMediaToTimeline: state.addProjectMediaToTimeline,
      removeProjectMedia: state.removeProjectMedia,
      setProjectSource: state.setProjectSource,
      updateProjectAspectRatio: state.updateProjectAspectRatio,
      upsertProjectMedia: state.upsertProjectMedia,
    }))
  )
}

export function useStudioToolState() {
  const toolState = useStudioEditorStore(
    useShallow((state) => ({
      activeTool: state.activeTool,
      project: state.project,
      setActiveTool: state.setActiveTool,
    }))
  )

  return {
    ...toolState,
    toolPanel: getToolPanel(toolState.activeTool, toolState.project),
  }
}

export function useStudioSelectionState() {
  const selectionState = useStudioEditorStore(
    useShallow((state) => ({
      project: state.project,
      selectChapter: state.selectChapter,
      selectClipCandidate: state.selectClipCandidate,
      selectShortClip: state.selectShortClip,
      selectedChapterId: state.selectedChapterId,
      selectedClipCandidateId: state.selectedClipCandidateId,
      selectedItemId: state.selectedItemId,
      selectedShortClipId: state.selectedShortClipId,
      selectedTranscriptSegmentId: state.selectedTranscriptSegmentId,
      selectTranscriptSegment: state.selectTranscriptSegment,
      setSelectedItemId: state.setSelectedItemId,
    }))
  )
  const selectedItem = getSelectedItem(selectionState)

  return {
    ...selectionState,
    selectedItem,
    selectedTargetId: getSelectedTargetId(selectedItem),
  }
}

export function useStudioPlaybackState() {
  return useStudioEditorStore(
    useShallow((state) => ({
      currentTime: state.currentTime,
      isPlaying: state.isPlaying,
      mutedTrackIds: state.mutedTrackIds,
      pausePlayback: state.pausePlayback,
      playPlayback: state.playPlayback,
      seekToTime: state.seekToTime,
      togglePlayback: state.togglePlayback,
      toggleTrackMute: state.toggleTrackMute,
    }))
  )
}

export function useStudioHistoryState() {
  return useStudioEditorStore(
    useShallow((state) => ({
      canRedo: state.historyFuture.length > 0,
      canUndo: state.historyPast.length > 0,
      redoEditorChange: state.redoEditorChange,
      undoEditorChange: state.undoEditorChange,
    }))
  )
}

export function useStudioTimelineActions() {
  return useStudioEditorStore(
    useShallow((state) => ({
      deleteTimelineSegment: state.deleteTimelineSegment,
      duplicateTimelineSegment: state.duplicateTimelineSegment,
      moveTimelineSegmentWithPush: state.moveTimelineSegmentWithPush,
      updateTimelineSegmentTiming: state.updateTimelineSegmentTiming,
    }))
  )
}

export function useStudioLayerActions() {
  return useStudioEditorStore(
    useShallow((state) => ({
      addTextLayerFromPreset: state.addTextLayerFromPreset,
      applyCaptionPreset: state.applyCaptionPreset,
      updateCanvasLayerPosition: state.updateCanvasLayerPosition,
      updateCaptionLayerStyle: state.updateCaptionLayerStyle,
      updateTextLayerContent: state.updateTextLayerContent,
      updateTextLayerStyle: state.updateTextLayerStyle,
    }))
  )
}

export function useStudioChapterActions() {
  return useStudioEditorStore(
    useShallow((state) => ({
      addChapterToEnd: state.addChapterToEnd,
      updateChapterTiming: state.updateChapterTiming,
      updateChapterTitle: state.updateChapterTitle,
    }))
  )
}

export function useStudioClipActions() {
  return useStudioEditorStore(
    useShallow((state) => ({
      createDraftClipFromCandidate: state.createDraftClipFromCandidate,
      setClipCandidateStatus: state.setClipCandidateStatus,
      updateClipCandidateDetails: state.updateClipCandidateDetails,
      updateClipCandidateTiming: state.updateClipCandidateTiming,
      updateShortClipDetails: state.updateShortClipDetails,
      updateShortClipTiming: state.updateShortClipTiming,
    }))
  )
}

export function useStudioTranscriptActions() {
  return useStudioEditorStore(
    useShallow((state) => ({
      commitTranscriptWordText: state.commitTranscriptWordText,
      discardTranscriptChanges: state.discardTranscriptChanges,
      hasUnsavedTranscriptChanges: state.hasUnsavedTranscriptChanges,
      markTranscriptDirty: state.markTranscriptDirty,
      saveTranscriptMock: state.saveTranscriptMock,
      updateTranscriptWordText: state.updateTranscriptWordText,
    }))
  )
}
