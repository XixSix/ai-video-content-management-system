"use client"

import { StudioPanelShell } from "@/features/studio-editor/components/studio-panel-shell"
import {
  useStudioSelectionState,
  useStudioToolState,
} from "@/features/studio-editor/store/studio-editor-store"

export function GenericToolPanel() {
  const { selectedTargetId, setSelectedItemId } = useStudioSelectionState()
  const { toolPanel } = useStudioToolState()

  return (
    <StudioPanelShell title={toolPanel.title}>
      <div className="flex flex-1 flex-col gap-4 p-4">
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
    </StudioPanelShell>
  )
}
