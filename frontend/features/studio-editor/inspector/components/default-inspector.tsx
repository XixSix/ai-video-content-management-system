import { getSelectionBadge } from "@/features/studio-editor/inspector/lib/selection-display"
import type { StudioSelection } from "@/features/studio-editor/studio.types"

export function DefaultInspector({ selectedItem }: { selectedItem: StudioSelection }) {
  return (
    <>
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
            {selectedItem.kind === "source" ? "Ready in canvas" : selectedItem.detail}
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
    </>
  )
}
