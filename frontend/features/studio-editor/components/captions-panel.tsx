"use client"

import { Search } from "lucide-react"

import { useStudioEditor } from "@/features/studio-editor/studio-editor-context"
import { StudioPanelShell } from "@/features/studio-editor/components/studio-panel-shell"
import { Input } from "@/components/ui/input"

export function CaptionsPanel() {
  const { selectedTargetId, setSelectedItemId, toolPanel } = useStudioEditor()
  const trackSection = toolPanel.sections[0]
  const styleSection = toolPanel.sections[1]

  return (
    <StudioPanelShell title={toolPanel.title}>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <section className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Transcript search
            </p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value=""
                readOnly
                aria-label="Search transcript"
                placeholder="Search captions and transcript text"
                className="pl-9"
              />
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              This tool now owns a custom panel. Transcript segments, editing, dirty
              state, and save controls can land here next without changing the panel
              architecture again.
            </p>
          </div>
        </section>

        {trackSection ? (
          <section className="rounded-xl border border-border bg-surface-muted p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {trackSection.title}
              </p>
              <span className="rounded-full border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
                Ready
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {trackSection.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.selectionId) {
                      setSelectedItemId(item.selectionId)
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-3 text-left transition hover:border-foreground/18 hover:bg-surface-muted/35"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      {item.meta ? (
                        <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
                      ) : null}
                    </div>
                    {item.selectionId === selectedTargetId ? (
                      <span className="shrink-0 rounded-full bg-sky-500/12 px-2 py-1 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                        Active
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {styleSection ? (
          <section className="rounded-xl border border-border bg-surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {styleSection.title}
            </p>
            <div className="mt-3 grid gap-2">
              {styleSection.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border bg-background px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      {item.meta ? (
                        <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="size-3 rounded-full bg-white shadow-[0_0_0_1px_var(--border)]" />
                      <span className="size-3 rounded-full bg-zinc-900 shadow-[0_0_0_1px_var(--border)] dark:bg-zinc-200" />
                      <span className="size-3 rounded-full bg-sky-500 shadow-[0_0_0_1px_var(--border)]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </StudioPanelShell>
  )
}
