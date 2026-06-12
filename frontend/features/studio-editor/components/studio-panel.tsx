"use client"

import { Ellipsis } from "lucide-react"

import { useStudioEditor } from "@/features/studio-editor/studio-editor-context"
import { Button } from "@/components/ui/button"

export function StudioPanel() {
  const { selectedTargetId, setSelectedItemId, toolPanel } = useStudioEditor()

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{toolPanel.title}</p>
        <Button variant="ghost" size="icon-xs" aria-label="More panel actions">
          <Ellipsis />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
        {toolPanel.sections.map((section) => (
          <section
            key={section.id}
            className="rounded-xl border border-border bg-surface-muted p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {section.title}
            </p>
            <div className="mt-3 space-y-2">
              {section.items.map((item) => (
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
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  {item.meta ? (
                    <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
                  ) : null}
                  {item.selectionId === selectedTargetId ? (
                    <p className="mt-2 text-[11px] font-medium text-sky-600 dark:text-sky-300">
                      Selected
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  )
}
