"use client"

import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  useStudioLayerActions,
  useStudioProjectState,
} from "@/features/studio-editor/store/studio-editor-store"
import { StudioPanelShell } from "@/features/studio-editor/tool-panel/components/studio-panel-shell"

import { TextLayerButton } from "./components/text-layer-button"

export function StudioTextPanel() {
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
