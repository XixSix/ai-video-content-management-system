import { Button } from "@/components/ui/button"
import {
  ColorField,
  SliderField,
  StyleSelect,
} from "@/features/studio-editor/inspector/components/inspector-fields"
import type { CaptionLayerStyleUpdate } from "@/features/studio-editor/inspector/lib/style-types"
import {
  studioTextAnimationByOptions,
  studioTextAnimationOptions,
} from "@/features/studio-editor/studio.data"
import type { StudioSelection } from "@/features/studio-editor/studio.types"

export function CaptionEffectsTab({
  layer,
  onUpdate,
}: {
  layer: Extract<StudioSelection, { kind: "layer" }>["layer"]
  onUpdate: (style: CaptionLayerStyleUpdate) => void
}) {
  const highlightColor = layer.highlightColor ?? "#3bff68"

  return (
    <div className="space-y-4">
      <StyleSelect
        label="Preset"
        value={layer.animationName}
        options={studioTextAnimationOptions}
        onChange={(value) =>
          onUpdate({
            animationName: value as typeof layer.animationName,
          })
        }
      />
      <StyleSelect
        label="By"
        value={layer.animationBy}
        options={studioTextAnimationByOptions}
        onChange={(value) =>
          onUpdate({
            animationBy: value as typeof layer.animationBy,
          })
        }
      />
      <SliderField
        label="Duration"
        min={0.2}
        max={1.8}
        step={0.1}
        value={Number((layer.animationDuration ?? 0.5).toFixed(1))}
        suffix="s"
        onChange={(value) =>
          onUpdate({
            animationDuration: value,
          })
        }
      />
      <div className="space-y-4 rounded-xl border border-border bg-background/70 p-3">
        <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Highlight</span>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={layer.highlightEnabled ? "default" : "ghost"}
              size="sm"
              onClick={() => onUpdate({ highlightEnabled: true })}
            >
              On
            </Button>
            <Button
              type="button"
              variant={layer.highlightEnabled ? "ghost" : "default"}
              size="sm"
              onClick={() => onUpdate({ highlightEnabled: false })}
            >
              Off
            </Button>
          </div>
        </div>
        <ColorField
          label="Color"
          value={highlightColor}
          onChange={(value) =>
            onUpdate({
              highlightColor: value,
            })
          }
        />
      </div>
    </div>
  )
}
