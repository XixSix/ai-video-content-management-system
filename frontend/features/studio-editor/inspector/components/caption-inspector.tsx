"use client"

import { useState } from "react"
import { Captions } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CaptionEffectsTab } from "@/features/studio-editor/inspector/components/caption-effects-tab"
import { CaptionFontTab } from "@/features/studio-editor/inspector/components/caption-font-tab"
import { CaptionPresetsTab } from "@/features/studio-editor/inspector/components/caption-presets-tab"
import { useStudioLayerActions } from "@/features/studio-editor/store/studio-editor-store"
import type { StudioSelection } from "@/features/studio-editor/studio.types"

type CaptionInspectorTab = "presets" | "font" | "effects"

const captionInspectorTabs: Array<{ id: CaptionInspectorTab; label: string }> = [
  { id: "presets", label: "Presets" },
  { id: "font", label: "Font" },
  { id: "effects", label: "Effects" },
]

export function CaptionInspector({
  layer,
}: {
  layer: Extract<StudioSelection, { kind: "layer" }>["layer"]
}) {
  const { applyCaptionPreset, updateCaptionLayerStyle } = useStudioLayerActions()
  const [activeTab, setActiveTab] = useState<CaptionInspectorTab>("presets")

  return (
    <>
      <section className="rounded-xl border border-border bg-surface-muted px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Selection
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
            <Captions className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{layer.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">caption overlay</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted">
        <div className="border-b border-border px-4 py-3">
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-background p-1">
            {captionInspectorTabs.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                size="sm"
                variant={activeTab === tab.id ? "default" : "ghost"}
                onClick={() => setActiveTab(tab.id)}
                className="h-8"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-5 p-4">
          {activeTab === "presets" ? (
            <CaptionPresetsTab layer={layer} onApplyPreset={applyCaptionPreset} />
          ) : null}

          {activeTab === "font" ? (
            <CaptionFontTab layer={layer} onUpdate={updateCaptionLayerStyle} />
          ) : null}

          {activeTab === "effects" ? (
            <CaptionEffectsTab layer={layer} onUpdate={updateCaptionLayerStyle} />
          ) : null}
        </div>
      </section>
    </>
  )
}
