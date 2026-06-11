"use client"

import { Ellipsis } from "lucide-react"

import { Button } from "@/components/ui/button"

export function StudioPanel() {
  return (
    <aside className="flex h-full min-h-0 w-[248px] shrink-0 flex-col overflow-hidden border-r border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Project panel</p>
          <p className="text-xs text-muted-foreground">Placeholder for the active tool.</p>
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
            <p className="mt-1 text-xs text-muted-foreground">
              31 min 04 sec · 1080p source · main project file
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Imported
          </p>
          <div className="mt-3 space-y-2">
            <div className="rounded-lg border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground">
              Brand marks, stills, and logo uploads will live here.
            </div>
            <div className="rounded-lg border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground">
              Text presets and caption styles can open in this panel later.
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Notes
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This column stays as the flexible tool panel beside the icon rail, so later we can
            swap media, assets, text, captions, audio, clips, and AI content without touching the
            main editor frame.
          </p>
        </section>
      </div>
    </aside>
  )
}
