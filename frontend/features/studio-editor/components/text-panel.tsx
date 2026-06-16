"use client"

import { Plus, Type } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StudioPanelShell } from "@/features/studio-editor/components/studio-panel-shell"
import {
  useStudioLayerActions,
  useStudioProjectState,
  useStudioSelectionState,
} from "@/features/studio-editor/store/studio-editor-store"
import type { StudioCanvasLayer } from "@/features/studio-editor/studio.types"
import { cn } from "@/lib/utils"

function TextLayerButton({ layer }: { layer: StudioCanvasLayer }) {
  const { selectedTargetId, setSelectedItemId } = useStudioSelectionState()
  const isSelected = selectedTargetId === layer.id

  return (
    <button
      type="button"
      onClick={() => setSelectedItemId(layer.id)}
      className={cn(
        "w-full rounded-lg border bg-background px-3 py-3 text-left transition",
        isSelected
          ? "border-sky-500/45 shadow-[0_0_0_1px_rgba(14,165,233,0.22)]"
          : "border-border hover:border-foreground/18 hover:bg-surface-muted/35"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg border",
            isSelected
              ? "border-sky-500/24 bg-sky-500/12 text-sky-700 dark:text-sky-300"
              : "border-border bg-surface-muted text-muted-foreground"
          )}
        >
          <Type className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {layer.content ?? layer.label}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{layer.label}</p>
        </div>
      </div>
    </button>
  )
}

export function TextPanel() {
  const { project } = useStudioProjectState()
  const { addTextLayerFromPreset } = useStudioLayerActions()
  const textLayers = project.layers.filter((layer) => layer.kind === "text")

  return (
    <StudioPanelShell title="Text">
      <div className="flex flex-1 flex-col gap-5 overflow-auto p-4">
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={() => addTextLayerFromPreset("hook-title")}
        >
          <Plus className="size-4" />
          Add text
        </Button>

        <section className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Quick add
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addTextLayerFromPreset("hook-title")}
            >
              Heading
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addTextLayerFromPreset("subtitle-line")}
            >
              Subheading
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addTextLayerFromPreset("label-tag")}
            >
              Label
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Text layers
            </p>
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {textLayers.length}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {textLayers.map((layer) => (
              <TextLayerButton key={layer.id} layer={layer} />
            ))}
          </div>
        </section>
      </div>
    </StudioPanelShell>
  )
}
