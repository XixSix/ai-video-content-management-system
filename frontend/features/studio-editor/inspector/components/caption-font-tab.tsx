import { Italic, Underline } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  ColorField,
  FontSelect,
  SliderField,
  StyleSelect,
} from "@/features/studio-editor/inspector/components/inspector-fields"
import type { CaptionLayerStyleUpdate } from "@/features/studio-editor/inspector/lib/style-types"
import { DEFAULT_CAPTION_STROKE_WIDTH } from "@/features/studio-editor/studio-caption-presets"
import { studioTextFontOptions } from "@/features/studio-editor/studio.data"
import type { StudioSelection } from "@/features/studio-editor/studio.types"

export function CaptionFontTab({
  layer,
  onUpdate,
}: {
  layer: Extract<StudioSelection, { kind: "layer" }>["layer"]
  onUpdate: (style: CaptionLayerStyleUpdate) => void
}) {
  const fontSize = layer.fontSize ?? 22
  const textColor = layer.textColor ?? "#ffffff"
  const backgroundColor = layer.backgroundColor ?? "#111111"
  const backgroundEnabled = layer.backgroundEnabled !== false
  const strokeColor = layer.strokeColor ?? "#000000"
  const strokeWidth = Number((layer.strokeWidth ?? 1).toFixed(1))

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-xl border border-border bg-background/70 p-3">
        <div className="flex items-center justify-between gap-3 border-b border-border/80 pb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Text</p>
            <p className="text-xs text-muted-foreground">
              Caption visibility, type, color, and emphasis.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Visible</span>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-1">
            <Button
              type="button"
              variant={layer.enabled === false ? "ghost" : "default"}
              size="sm"
              onClick={() => onUpdate({ enabled: true })}
            >
              On
            </Button>
            <Button
              type="button"
              variant={layer.enabled === false ? "default" : "ghost"}
              size="sm"
              onClick={() => onUpdate({ enabled: false })}
            >
              Off
            </Button>
          </div>
        </div>

        <FontSelect
          label="Font"
          value={layer.fontFamily}
          options={studioTextFontOptions}
          onChange={(value) =>
            onUpdate({
              fontFamily: value as typeof layer.fontFamily,
            })
          }
        />
        <ColorField
          label="Color"
          value={textColor}
          onChange={(value) => onUpdate({ textColor: value })}
        />
        <SliderField
          label="Size"
          min={14}
          max={40}
          value={fontSize}
          suffix="px"
          onChange={(value) => onUpdate({ fontSize: value })}
        />
        <StyleSelect
          label="Weight"
          value={layer.fontWeight}
          options={[
            { label: "Regular", value: "regular" },
            { label: "Bold", value: "bold" },
          ]}
          onChange={(value) =>
            onUpdate({
              fontWeight: value as typeof layer.fontWeight,
            })
          }
        />
        <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Decoration</span>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-1">
            <Button
              type="button"
              variant={layer.fontStyle === "italic" ? "default" : "ghost"}
              size="sm"
              aria-label="Toggle italic"
              onClick={() =>
                onUpdate({
                  fontStyle: layer.fontStyle === "italic" ? "normal" : "italic",
                })
              }
            >
              <Italic className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant={layer.textDecoration === "underline" ? "default" : "ghost"}
              size="sm"
              aria-label="Toggle underline"
              onClick={() =>
                onUpdate({
                  textDecoration:
                    layer.textDecoration === "underline" ? "none" : "underline",
                })
              }
            >
              <Underline className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Uppercase</span>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-1">
            <Button
              type="button"
              variant={layer.textTransform === "uppercase" ? "ghost" : "default"}
              size="sm"
              onClick={() => onUpdate({ textTransform: "none" })}
            >
              Off
            </Button>
            <Button
              type="button"
              variant={layer.textTransform === "uppercase" ? "default" : "ghost"}
              size="sm"
              onClick={() =>
                onUpdate({
                  textTransform: "uppercase",
                })
              }
            >
              On
            </Button>
          </div>
        </div>
      </div>

      <div className="h-px bg-border/80" />

      <div className="space-y-4 rounded-xl border border-border bg-background/70 p-3">
        <div className="flex items-center justify-between gap-3 border-b border-border/80 pb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Background</p>
            <p className="text-xs text-muted-foreground">
              Control the caption chip behind the text.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Visible</span>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-1">
            <Button
              type="button"
              variant={backgroundEnabled ? "default" : "ghost"}
              size="sm"
              onClick={() => onUpdate({ backgroundEnabled: true })}
            >
              On
            </Button>
            <Button
              type="button"
              variant={backgroundEnabled ? "ghost" : "default"}
              size="sm"
              onClick={() => onUpdate({ backgroundEnabled: false })}
            >
              Off
            </Button>
          </div>
        </div>
        <ColorField
          label="Fill"
          value={backgroundColor}
          onChange={(value) => onUpdate({ backgroundColor: value })}
        />
      </div>

      <div className="h-px bg-border/80" />

      <div className="space-y-4 rounded-xl border border-border bg-background/70 p-3">
        <div className="flex items-center justify-between gap-3 border-b border-border/80 pb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Outline & Shadow</p>
            <p className="text-xs text-muted-foreground">
              Stroke and shadow for readability.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Stroke</span>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={layer.strokeEnabled ? "default" : "ghost"}
              size="sm"
              onClick={() =>
                onUpdate({
                  strokeEnabled: true,
                  strokeWidth:
                    layer.strokeWidth && layer.strokeWidth > 0
                      ? layer.strokeWidth
                      : DEFAULT_CAPTION_STROKE_WIDTH,
                })
              }
            >
              On
            </Button>
            <Button
              type="button"
              variant={layer.strokeEnabled ? "ghost" : "default"}
              size="sm"
              onClick={() =>
                onUpdate({
                  strokeEnabled: false,
                  strokeWidth: 0,
                })
              }
            >
              Off
            </Button>
          </div>
        </div>
        <ColorField
          label="Color"
          value={strokeColor}
          onChange={(value) => onUpdate({ strokeColor: value })}
        />
        <SliderField
          label="Width"
          min={0}
          max={4}
          value={strokeWidth}
          step={0.1}
          suffix="px"
          onChange={(value) =>
            onUpdate({
              strokeWidth: value,
            })
          }
        />
        <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Shadow</span>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={layer.shadowEnabled ? "default" : "ghost"}
              size="sm"
              onClick={() => onUpdate({ shadowEnabled: true })}
            >
              On
            </Button>
            <Button
              type="button"
              variant={layer.shadowEnabled ? "ghost" : "default"}
              size="sm"
              onClick={() => onUpdate({ shadowEnabled: false })}
            >
              Off
            </Button>
          </div>
        </div>
        <StyleSelect
          label="Style"
          value={layer.shadowStyle}
          options={[
            { label: "Soft", value: "soft" },
            { label: "Hard", value: "hard" },
          ]}
          onChange={(value) =>
            onUpdate({
              shadowStyle: value as typeof layer.shadowStyle,
            })
          }
        />
      </div>
    </div>
  )
}
