"use client"

export function StudioInspector() {
  return (
    <aside className="flex h-full min-h-0 w-[292px] shrink-0 flex-col overflow-hidden border-l border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Inspector</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No detailed controls yet. This side will follow canvas or timeline selection.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
        <section className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Selection
          </p>
          <p className="mt-3 text-sm font-medium text-foreground">Hook text overlay</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Selected layer preview with bounds and handles shown on the canvas.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Transform
          </p>
          <div className="mt-3 space-y-2">
            <div className="rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              Position, scale, crop, and duration controls land here.
            </div>
            <div className="rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              Platform safe areas and frame guides can show contextual settings.
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Style
          </p>
          <div className="mt-3 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            Typography, color, caption treatment, and visual presets will sit in this column.
          </div>
        </section>
      </div>
    </aside>
  )
}
