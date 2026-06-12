"use client"

import { useStudioEditor } from "@/features/studio-editor/studio-editor-context"
import type { StudioSelection } from "@/features/studio-editor/studio.types"

function getSelectionBadge(selectionKind: StudioSelection["kind"]) {
  if (selectionKind === "source") {
    return "Source"
  }

  if (selectionKind === "segment") {
    return "Timeline"
  }

  return "Canvas"
}

export function StudioInspector() {
  const { selectedItem } = useStudioEditor()

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Inspector</p>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
        <section className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Selection
          </p>
          <div className="mt-3 space-y-2">
            <span className="inline-flex rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {getSelectionBadge(selectedItem.kind)}
            </span>
            <p className="text-sm font-medium text-foreground">{selectedItem.label}</p>
            <p className="text-sm text-muted-foreground">{selectedItem.summary}</p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Details
          </p>
          <div className="mt-3 space-y-2">
            <div className="rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              {selectedItem.kind === "source"
                ? "Ready in canvas"
                : selectedItem.detail}
            </div>
            {selectedItem.kind === "segment" ? (
              <div className="rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                {selectedItem.trackLabel}
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Actions
          </p>
          <div className="mt-3 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            Position
          </div>
        </section>
      </div>
    </aside>
  )
}
