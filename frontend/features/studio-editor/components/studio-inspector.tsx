"use client"

export function StudioInspector() {
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
          <p className="mt-3 text-sm font-medium text-foreground">Hook text overlay</p>
        </section>

        <section className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Transform
          </p>
          <div className="mt-3 space-y-2">
            <div className="rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              Position
            </div>
            <div className="rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              Scale
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Style
          </p>
          <div className="mt-3 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            Presets
          </div>
        </section>
      </div>
    </aside>
  )
}
