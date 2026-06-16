"use client"

import { buildCaptionCues } from "@/features/studio-editor/lib/caption-cues"
import { StudioPanelShell } from "@/features/studio-editor/tool-panel/components/studio-panel-shell"
import {
  useStudioPlaybackState,
  useStudioProjectState,
  useStudioSelectionState,
  useStudioTranscriptActions,
} from "@/features/studio-editor/store/studio-editor-store"
import type { StudioCaptionCue } from "@/features/studio-editor/studio.types"

import { CaptionCueList } from "./components/caption-cue-list"
import { CaptionsToolbar } from "./components/captions-toolbar"
import { useActiveCaptionScroll } from "./hooks/use-active-caption-scroll"
import { useCaptionSearch } from "./hooks/use-caption-search"
import { useCaptionWordEdit } from "./hooks/use-caption-word-edit"

export function StudioCaptionsPanel() {
  const { commitTranscriptWordText, discardTranscriptChanges } =
    useStudioTranscriptActions()
  const { currentTime, seekToTime } = useStudioPlaybackState()
  const { project } = useStudioProjectState()
  const { selectTranscriptSegment } = useStudioSelectionState()
  const cues = buildCaptionCues(project.transcriptSegments, project.transcriptWords)
  const {
    activeCueId,
    closeSearch,
    filteredCues,
    isSearchOpen,
    searchInput,
    setIsSearchOpen,
    setSearchInput,
  } = useCaptionSearch({
    cues,
    currentTime,
  })
  const activeCueRef = useActiveCaptionScroll(activeCueId)
  const {
    cancelEditingWord,
    commitEditingWord,
    editingText,
    editingWordId,
    setEditingText,
    startEditingWord,
  } = useCaptionWordEdit({
    onCommitWordText: commitTranscriptWordText,
  })

  const selectCue = (cue: StudioCaptionCue) => {
    selectTranscriptSegment(cue.sourceSegmentIds[0])
    seekToTime(cue.startTime)
  }

  return (
    <StudioPanelShell title="Captions">
      <div className="flex min-h-0 flex-1 flex-col bg-background">
        <CaptionsToolbar
          cueCount={cues.length}
          filteredCueCount={filteredCues.length}
          isSearchOpen={isSearchOpen}
          language={project.transcript.language}
          onCloseSearch={closeSearch}
          onDiscardChanges={() => {
            cancelEditingWord()
            discardTranscriptChanges()
          }}
          onOpenSearch={() => setIsSearchOpen(true)}
          onSearchInputChange={setSearchInput}
          searchInput={searchInput}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <CaptionCueList
            activeCueId={activeCueId}
            activeCueRef={activeCueRef}
            currentTime={currentTime}
            editingText={editingText}
            editingWordId={editingWordId}
            filteredCues={filteredCues}
            onCancelEditing={cancelEditingWord}
            onCommitEditing={commitEditingWord}
            onEditingTextChange={setEditingText}
            onSelectCue={selectCue}
            onStartEditing={startEditingWord}
          />
        </div>
      </div>
    </StudioPanelShell>
  )
}
