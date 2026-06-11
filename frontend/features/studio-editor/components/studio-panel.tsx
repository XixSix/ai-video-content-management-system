"use client"

import { Ellipsis } from "lucide-react"

import { Button } from "@/components/ui/button"

export function StudioPanel() {
  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Media</p>
        </div>
        <Button variant="ghost" size="icon-xs" aria-label="More panel actions">
          <Ellipsis />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
        <section className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Source media
          </p>
          <div className="mt-3 rounded-lg border border-border bg-background p-3">
            <p className="text-sm font-medium text-foreground">Keynote_source_v3.mp4</p>
            <p className="mt-1 text-xs text-muted-foreground">31:04 · 1080p</p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Imported
          </p>
          <div className="mt-3 space-y-2">
            <div className="rounded-lg border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground">
              Images
            </div>
            <div className="rounded-lg border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground">
              Captions
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Notes
          </p>
          <p className="mt-3 text-sm text-muted-foreground">No notes yet.</p>
        </section>
      </div>
    </aside>
  )
}
