import { getStudioToolPanels } from "../data/tool-panels.data"
import { getStudioSelectionById } from "../lib/selection"
import type {
  StudioEditorProject,
  StudioSelection,
  StudioStaleOutputType,
  StudioToolId,
} from "../studio.types"
import type { StudioEditorState } from "./studio-editor-state"

export function getSelectedItem(state: Pick<StudioEditorState, "project" | "selectedItemId">) {
  return getStudioSelectionById(state.project, state.selectedItemId)
}

export function getSelectedTargetId(selectedItem: StudioSelection) {
  if (selectedItem.kind === "segment") {
    return selectedItem.linkedSelectionId
  }

  if (selectedItem.kind === "media" && selectedItem.linkedSelectionId) {
    return selectedItem.linkedSelectionId
  }

  return selectedItem.id
}

export function getToolPanel(activeTool: StudioToolId, project: StudioEditorProject) {
  return getStudioToolPanels(project)[activeTool]
}

export function getStaleOutputState(project: StudioEditorProject) {
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

  return {
    hasStaleAssets,
    hasStaleChapters,
    hasStaleClips,
    staleOutputTypes,
  }
}
