import {
  AlignCenter,
  AlignLeft,
  AlignRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ColorField } from "@/features/studio-editor/inspector/components/fields/color-field"
import { FontSelect } from "@/features/studio-editor/inspector/components/fields/font-select"
import { SliderField } from "@/features/studio-editor/inspector/components/fields/slider-field"
import { StyleSelect } from "@/features/studio-editor/inspector/components/fields/style-select"
import type { TextLayerStyleUpdate } from "@/features/studio-editor/inspector/lib/style-types"
import {
  studioTextAnimationByOptions,
  studioTextAnimationOptions,
  studioTextFontOptions,
} from "@/features/studio-editor/data/text-style.data"
import { useStudioLayerActions } from "@/features/studio-editor/store/studio-editor-store"
import type { StudioSelection } from "@/features/studio-editor/studio.types"

export function TextInspector({
  layer,
}: {
  layer: Extract<StudioSelection, { kind: "layer" }>["layer"]
}) {
  const { updateTextLayerContent, updateTextLayerStyle } = useStudioLayerActions()
  const content = layer.content ?? ""
  const fontSize = layer.fontSize ?? 16
  const backgroundColor = layer.backgroundColor ?? "#101010"
  const backgroundEnabled = layer.backgroundEnabled === true
  const backgroundRadius = layer.backgroundRadius ?? 0
  const widthPercent = layer.widthPercent ?? layer.boxWidth ?? 46
  const textColor = layer.textColor ?? "#ffffff"

  const updateStyle = (style: TextLayerStyleUpdate) => {
    updateTextLayerStyle(layer.id, style)
  }

  return (
    <>
      <section className="rounded-xl border border-border bg-surface-muted">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Input</p>
        </div>

        <div className="p-4">
          <textarea
            value={content}
            aria-label="Text input"
            onChange={(event) => updateTextLayerContent(layer.id, event.target.value)}
            className="block min-h-24 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30"
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Style</p>
        </div>

        <div className="space-y-4 p-4">
          <FontSelect
            label="Font"
            value={layer.fontFamily}
            options={studioTextFontOptions}
            onChange={(value) =>
              updateStyle({
                fontFamily: value as typeof layer.fontFamily,
              })
            }
          />
          <StyleSelect
            label="Weight"
            value={layer.fontWeight}
            options={[
              { label: "Regular", value: "regular" },
              { label: "Bold", value: "bold" },
            ]}
            onChange={(value) =>
              updateStyle({
                fontWeight: value as typeof layer.fontWeight,
              })
            }
          />
          <StyleSelect
            label="Style"
            value={layer.fontStyle}
            options={[
              { label: "Normal", value: "normal" },
              { label: "Italic", value: "italic" },
            ]}
            onChange={(value) =>
              updateStyle({
                fontStyle: value as typeof layer.fontStyle,
              })
            }
          />
          <SliderField
            label="Size"
            min={10}
            max={140}
            value={fontSize}
            suffix="px"
            onChange={(value) =>
              updateStyle({
                fontSize: value,
              })
            }
          />

          <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Alignment</span>
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-background p-1">
              <Button
                type="button"
                variant={layer.textAlign === "left" ? "default" : "ghost"}
                size="sm"
                aria-label="Align left"
                onClick={() => updateStyle({ textAlign: "left" })}
              >
                <AlignLeft className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant={layer.textAlign === "center" ? "default" : "ghost"}
                size="sm"
                aria-label="Align center"
                onClick={() => updateStyle({ textAlign: "center" })}
              >
                <AlignCenter className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant={layer.textAlign === "right" ? "default" : "ghost"}
                size="sm"
                aria-label="Align right"
                onClick={() => updateStyle({ textAlign: "right" })}
              >
                <AlignRight className="size-3.5" />
              </Button>
            </div>
          </div>

          <ColorField
            label="Color"
            value={textColor}
            onChange={(value) => updateStyle({ textColor: value })}
          />

          <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Background</span>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-1">
              <Button
                type="button"
                variant={backgroundEnabled ? "default" : "ghost"}
                size="sm"
                onClick={() =>
                  updateStyle({
                    backgroundEnabled: true,
                    backgroundStyle: "box",
                  })
                }
              >
                On
              </Button>
              <Button
                type="button"
                variant={backgroundEnabled ? "ghost" : "default"}
                size="sm"
                onClick={() => updateStyle({ backgroundEnabled: false })}
              >
                Off
              </Button>
            </div>
          </div>

          {backgroundEnabled ? (
            <>
              <ColorField
                label="Fill"
                value={backgroundColor}
                onChange={(value) =>
                  updateStyle({
                    backgroundColor: value,
                    backgroundEnabled: true,
                    backgroundStyle: "box",
                  })
                }
              />
              <SliderField
                label="Radius"
                min={0}
                max={40}
                value={backgroundRadius}
                suffix="px"
                onChange={(value) =>
                  updateStyle({
                    backgroundRadius: value,
                  })
                }
              />
            </>
          ) : null}
          <SliderField
            label="Width"
            min={18}
            max={80}
            value={widthPercent}
            suffix="%"
            onChange={(value) =>
              updateStyle({
                widthPercent: value,
              })
            }
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Animation</p>
        </div>

        <div className="space-y-4 p-4">
          <StyleSelect
            label="Preset"
            value={layer.animationName}
            options={studioTextAnimationOptions}
            onChange={(value) =>
              updateStyle({
                animationName: value as typeof layer.animationName,
              })
            }
          />
          <StyleSelect
            label="By"
            value={layer.animationBy}
            options={studioTextAnimationByOptions}
            onChange={(value) =>
              updateStyle({
                animationBy: value as typeof layer.animationBy,
              })
            }
          />
          <SliderField
            label="Duration"
            min={1}
            max={20}
            value={Math.round((layer.animationDuration ?? 0.8) * 10)}
            suffix="ms"
            onChange={(value) =>
              updateStyle({
                animationDuration: value / 10,
              })
            }
          />
        </div>
      </section>
    </>
  )
}
