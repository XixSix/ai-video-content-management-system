import type { Ref } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatCaptionTimestamp } from "@/features/studio-editor/studio-captions"
import { cn } from "@/lib/utils"

import type { StudioCaptionCue } from "../../studio.types"
import { CaptionWordEditor } from "./caption-word-editor"

export function CaptionCueRow({
  activeCueRef,
  cue,
  currentTime,
  editingText,
  editingWordId,
  isActive,
  onCancelEditing,
  onCommitEditing,
  onEditingTextChange,
  onSelectCue,
  onStartEditing,
}: {
  activeCueRef: Ref<HTMLDivElement>
  cue: StudioCaptionCue
  currentTime: number
  editingText: string
  editingWordId: string | null
  isActive: boolean
  onCancelEditing: () => void
  onCommitEditing: () => void
  onEditingTextChange: (value: string) => void
  onSelectCue: (cue: StudioCaptionCue) => void
  onStartEditing: (input: { text: string; wordId: string }) => void
}) {
  return (
    <div
      ref={isActive ? activeCueRef : null}
      role="button"
      tabIndex={0}
      onClick={() => onSelectCue(cue)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return
        }

        event.preventDefault()
        onSelectCue(cue)
      }}
      className={cn(
        "group w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-3 text-left outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        isActive
          ? "border-foreground/20 bg-muted/45"
          : "hover:border-foreground/15 hover:bg-surface-muted/35"
      )}
    >
      <div className="grid grid-cols-[auto_1px_minmax(0,1fr)] gap-3">
        <div className="flex min-w-[116px] items-center gap-2 self-start rounded-md border border-border bg-muted/45 px-2 py-1.5">
          <Avatar size="sm">
            <AvatarFallback>
              {cue.speakerLabel.replace("Speaker ", "S")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-foreground">
              {cue.speakerLabel}
            </p>
          </div>
        </div>

        <div className="w-px self-stretch bg-border/80" />

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {formatCaptionTimestamp(cue.startTime)}
            </p>
            {cue.wordGroups.some((group) => group.isEdited) ? (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Edited
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-1 gap-y-1.5">
            {cue.wordGroups.map((wordGroup) => (
              <CaptionWordEditor
                key={wordGroup.id}
                currentTime={currentTime}
                editingText={editingText}
                editingWordId={editingWordId}
                isCueActive={isActive}
                onCancelEditing={onCancelEditing}
                onCommitEditing={onCommitEditing}
                onEditingTextChange={onEditingTextChange}
                onStartEditing={onStartEditing}
                wordGroup={wordGroup}
              />
            ))}
          </div>

          <p className="mt-2 font-mono text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {formatCaptionTimestamp(cue.endTime)}
          </p>
        </div>
      </div>
    </div>
  )
}
