import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Type as TextIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  ColorField,
  FontSelect,
  SliderField,
  StyleSelect,
} from "@/features/studio-editor/inspector/components/inspector-fields"
import type { TextLayerStyleUpdate } from "@/features/studio-editor/inspector/lib/style-types"
import {
  studioTextAnimationByOptions,
  studioTextAnimationOptions,
  studioTextFontOptions,
} from "@/features/studio-editor/studio.data"
import { useStudioEditor } from "@/features/studio-editor/studio-editor-context"
import type { StudioSelection } from "@/features/studio-editor/studio.types"

function TypeIcon() {
  return <TextIcon className="size-4" />
}

export function TextInspector({
  layer,
}: {
  layer: Extract<StudioSelection, { kind: "layer" }>["layer"]
}) {
  const { updateTextLayerContent, updateTextLayerStyle } = useStudioEditor()
  const content = layer.content ?? ""
  const fontSize = layer.fontSize ?? 16
  const backgroundColor = layer.backgroundColor ?? "#101010"
  const backgroundRadius = layer.backgroundRadius ?? 16
  const boxWidth = layer.boxWidth ?? 46
  const textColor = layer.textColor ?? "#ffffff"

  const updateStyle = (style: TextLayerStyleUpdate) => {
    updateTextLayerStyle(layer.id, style)
  }

  return (
    <>
      <section className="rounded-xl border border-border bg-surface-muted px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Selection
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
            <TypeIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{layer.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">text overlay</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Style</p>
        </div>

        <div className="space-y-5 p-4">
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">Input</span>
            <textarea
              value={content}
              onChange={(event) => updateTextLayerContent(layer.id, event.target.value)}
              className="min-h-24 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30"
            />
          </label>

          <div className="space-y-4">
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
            <ColorField
              label="Background"
              value={backgroundColor}
              onChange={(value) =>
                updateStyle({
                  backgroundColor: value,
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
            <SliderField
              label="Width"
              min={18}
              max={80}
              value={boxWidth}
              suffix="%"
              onChange={(value) =>
                updateStyle({
                  boxWidth: value,
                })
              }
            />
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <p className="text-sm font-semibold text-foreground">Animation</p>
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
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Actions
        </p>
        <div className="mt-3 grid gap-2">
          {["Duplicate", "Bring forward", "Delete"].map((action, actionIndex) => (
            <Button
              key={action}
              type="button"
              variant={actionIndex === 2 ? "destructive" : "outline"}
              size="sm"
              className="justify-start"
            >
              {action}
            </Button>
          ))}
        </div>
      </section>
    </>
  )
}
