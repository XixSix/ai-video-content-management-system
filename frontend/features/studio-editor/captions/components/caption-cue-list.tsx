import type { RefObject } from "react"

import type { StudioCaptionCue } from "../../studio.types"
import { CaptionsEmptyState } from "./captions-empty-state"
import { CaptionCueRow } from "./caption-cue-row"

export function CaptionCueList({
  activeCueId,
  activeCueRef,
  currentTime,
  editingText,
  editingWordId,
  filteredCues,
  onCancelEditing,
  onCommitEditing,
  onEditingTextChange,
  onSelectCue,
  onStartEditing,
}: {
  activeCueId: string | undefined
  activeCueRef: RefObject<HTMLDivElement | null>
  currentTime: number
  editingText: string
  editingWordId: string | null
  filteredCues: StudioCaptionCue[]
  onCancelEditing: () => void
  onCommitEditing: () => void
  onEditingTextChange: (value: string) => void
  onSelectCue: (cue: StudioCaptionCue) => void
  onStartEditing: (input: { text: string; wordId: string }) => void
}) {
  if (filteredCues.length === 0) {
    return <CaptionsEmptyState />
  }

  return (
    <div className="space-y-3">
      {filteredCues.map((cue) => (
        <CaptionCueRow
          key={cue.id}
          activeCueRef={activeCueRef}
          cue={cue}
          currentTime={currentTime}
          editingText={editingText}
          editingWordId={editingWordId}
          isActive={cue.id === activeCueId}
          onCancelEditing={onCancelEditing}
          onCommitEditing={onCommitEditing}
          onEditingTextChange={onEditingTextChange}
          onSelectCue={onSelectCue}
          onStartEditing={onStartEditing}
        />
      ))}
    </div>
  )
}
