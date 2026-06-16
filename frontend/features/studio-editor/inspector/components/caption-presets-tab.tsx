import { Check } from "lucide-react"

import {
  getCaptionPreviewChipStyle,
  getCaptionPreviewTextStyle,
  getFontPreviewStyle,
} from "@/features/studio-editor/inspector/lib/style-preview"
import { studioCaptionPresets } from "@/features/studio-editor/studio-caption-presets"
import type { StudioSelection } from "@/features/studio-editor/studio.types"
import { cn } from "@/lib/utils"

export function CaptionPresetsTab({
  layer,
  onApplyPreset,
}: {
  layer: Extract<StudioSelection, { kind: "layer" }>["layer"]
  onApplyPreset: (presetId: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {studioCaptionPresets.map((preset) => {
        const isActive = layer.presetId === preset.id

        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApplyPreset(preset.id)}
            className={cn(
              "rounded-xl border bg-background p-2 text-left transition",
              isActive
                ? "border-foreground/40 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                : "border-border hover:border-foreground/20"
            )}
          >
            <div className="flex aspect-[1.08] items-center justify-center rounded-lg bg-[#121212] px-3 text-center">
              {preset.style.enabled ? (
                <span
                  className="inline-flex items-center justify-center leading-none"
                  style={getCaptionPreviewChipStyle(preset.style)}
                >
                  <span
                    className="inline-block leading-none"
                    style={getCaptionPreviewTextStyle(preset.style)}
                  >
                    {preset.previewText}
                  </span>
                </span>
              ) : (
                <span
                  className="inline-block text-sm font-semibold uppercase tracking-[0.12em] text-white/70"
                  style={getFontPreviewStyle("poppins")}
                >
                  {preset.previewText}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-foreground">
                {preset.label}
              </span>
              {isActive ? <Check className="size-4 text-foreground" /> : null}
            </div>
          </button>
        )
      })}
    </div>
  )
}
