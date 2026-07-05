import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import type { StudioCaptionWordGroup } from "../../studio.types"
import { isWordGroupActive } from "../lib/caption-activity"

export function CaptionWordEditor({
  currentTime,
  editingText,
  editingWordId,
  isCueActive,
  onCancelEditing,
  onCommitEditing,
  onEditingTextChange,
  onStartEditing,
  wordGroup,
}: {
  currentTime: number
  editingText: string
  editingWordId: string | null
  isCueActive: boolean
  onCancelEditing: () => void
  onCommitEditing: () => void
  onEditingTextChange: (value: string) => void
  onStartEditing: (input: { text: string; wordId: string }) => void
  wordGroup: StudioCaptionWordGroup
}) {
  const wordIsActive = isWordGroupActive(wordGroup, currentTime)
  const wordIsEditing = editingWordId === wordGroup.sourceWordId
  const wordClassName = cn(
    "rounded-md px-1.5 py-0.5 text-left text-[15px] leading-6 text-foreground/90 transition",
    isCueActive ? "text-foreground" : null,
    wordGroup.isEdited ? "ring-1 ring-amber-500/18" : null,
    wordGroup.isOmitted
      ? "border border-dashed border-border/70 text-[11px] text-muted-foreground"
      : null,
    wordGroup.isSynthetic
      ? "cursor-default"
      : "hover:bg-foreground/6 data-[active=true]:bg-foreground/10 data-[active=true]:text-foreground"
  )

  if (wordIsEditing) {
    return (
      <Input
        value={editingText}
        autoFocus
        onChange={(event) => onEditingTextChange(event.target.value)}
        onBlur={onCommitEditing}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation()

          if (event.key === "Enter") {
            event.preventDefault()
            onCommitEditing()
          }

          if (event.key === "Escape") {
            event.preventDefault()
            onCancelEditing()
          }
        }}
        className="h-7 min-w-24 max-w-56 rounded-md border-border/80 bg-background/90 px-2 text-xs shadow-sm"
      />
    )
  }

  if (wordGroup.isSynthetic) {
    return (
      <span data-active={wordIsActive} className={wordClassName}>
        {wordGroup.isOmitted ? "Removed" : wordGroup.text}
      </span>
    )
  }

  return (
    <button
      type="button"
      data-active={wordIsActive}
      onClick={(event) => {
        event.stopPropagation()
        onStartEditing({
          text: wordGroup.text,
          wordId: wordGroup.sourceWordId,
        })
      }}
      onKeyDown={(event) => event.stopPropagation()}
      className={wordClassName}
    >
      {wordGroup.isOmitted ? "Removed" : wordGroup.text}
    </button>
  )
}
