"use client"

import type { CSSProperties } from "react"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  ChevronDown,
  FileText,
  Film,
  ImageIcon,
  MoreHorizontal,
  Music2,
  Type as TextIcon,
  Volume2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  studioTextAnimationByOptions,
  studioTextAnimationOptions,
  studioTextFontOptions,
} from "@/features/studio-editor/studio.data"
import { useStudioEditor } from "@/features/studio-editor/studio-editor-context"
import type {
  StudioProjectMediaItem,
  StudioProjectMediaType,
  StudioSelection,
} from "@/features/studio-editor/studio.types"

function getSelectionBadge(selectionKind: StudioSelection["kind"]) {
  if (selectionKind === "media") {
    return "Media"
  }

  if (selectionKind === "source") {
    return "Source"
  }

  if (selectionKind === "segment") {
    return "Timeline"
  }

  return "Canvas"
}

function MediaTypeIcon({ type }: { type: StudioProjectMediaType }) {
  if (type === "AUDIO") {
    return <Music2 className="size-4" />
  }

  if (type === "IMAGE") {
    return <ImageIcon className="size-4" />
  }

  if (type === "SUBTITLE") {
    return <FileText className="size-4" />
  }

  return <Film className="size-4" />
}

function ControlRow({
  control,
  label,
  value,
}: {
  control?: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)_3.5rem] items-center gap-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex min-w-0 items-center gap-3">
        {control ? <div className="shrink-0">{control}</div> : null}
        <div className="relative h-1 min-w-0 flex-1 rounded-full bg-muted">
          <div className="absolute inset-y-0 left-0 rounded-full bg-foreground/85" style={{ width: value === "100 %" ? "62%" : value === "1.0 x" ? "34%" : "3%" }} />
          <div className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-foreground" style={{ left: value === "100 %" ? "62%" : value === "1.0 x" ? "34%" : "3%" }} />
        </div>
      </div>
      <span className="rounded-lg border border-border bg-background px-2 py-1 text-right text-xs font-medium text-foreground">
        {value}
      </span>
    </div>
  )
}

function SelectRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)_3.5rem] items-center gap-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <button
        type="button"
        className="flex h-8 min-w-0 items-center justify-between rounded-lg border border-border bg-background px-2 text-left text-xs font-medium text-foreground"
      >
        <span className="truncate">None</span>
        <span className="text-muted-foreground">⌄</span>
      </button>
      <span className="rounded-lg border border-border bg-background px-2 py-1 text-right text-xs font-medium text-muted-foreground">
        {value}
      </span>
    </div>
  )
}

function getMediaActions(media: StudioProjectMediaItem) {
  if (media.type === "VIDEO") {
    return ["Open in timeline", "Replace source", "Set fit mode"]
  }

  if (media.type === "AUDIO") {
    return ["Open in timeline", "Adjust volume", "Enable ducking"]
  }

  if (media.type === "IMAGE") {
    return media.linkedSelectionId
      ? ["Select canvas layer", "Adjust opacity", "Move layer order"]
      : ["Add to canvas", "Crop image", "Use as thumbnail"]
  }

  return ["Apply to Captions", "Burn into video", "Check sync"]
}

function MediaEditPanel({ media }: { media: StudioProjectMediaItem }) {
  const title =
    media.type === "AUDIO" ? "Edit Audio" : media.type === "IMAGE" ? "Edit Image" : "Edit Video"

  return (
    <section className="rounded-xl border border-border bg-surface-muted">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="More media settings">
          <MoreHorizontal className="size-4" />
        </Button>
      </div>

      <div className="space-y-5 p-4">
        {media.type === "VIDEO" || media.type === "IMAGE" ? (
          <div className="grid grid-cols-3 gap-2">
            {["Fit", "Fill", "Crop"].map((mode) => (
              <Button
                key={mode}
                type="button"
                variant={mode === "Fit" ? "default" : "outline"}
                size="sm"
              >
                {mode}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">Playback</p>
          <ControlRow
            label="Volume"
            value={media.type === "AUDIO" && media.usageLabel === "Music" ? "-18 dB" : "100 %"}
            control={
              <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background">
                <Volume2 className="size-4 text-foreground" />
              </span>
            }
          />
          <ControlRow label="Fade In" value="0 s" />
          <ControlRow label="Fade Out" value="0 s" />
          <ControlRow label="Speed" value="1.0 x" />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">Animation</p>
          <SelectRow label="In" value="0.0 s" />
          <SelectRow label="Out" value="0.0 s" />
        </div>
      </div>
    </section>
  )
}

function MediaInspector({ media }: { media: StudioProjectMediaItem }) {
  return (
    <>
      <section className="rounded-xl border border-border bg-surface-muted px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Selection
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
            <MediaTypeIcon type={media.type} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{media.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{media.type.toLowerCase()}</p>
          </div>
        </div>
      </section>

      <MediaEditPanel media={media} />

      <section className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Actions
        </p>
        <div className="mt-3 grid gap-2">
          {getMediaActions(media).map((action, actionIndex) => (
            <Button
              key={action}
              type="button"
              variant={actionIndex === 0 ? "default" : "outline"}
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

function StyleSelect({
  previewFont,
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  previewFont?: boolean
  value: string | undefined
}) {
  const previewFontStyle: CSSProperties | undefined = previewFont
    ? {
        fontFamily:
          value === "montserrat"
            ? "var(--font-montserrat)"
            : value === "bebas-neue"
              ? "var(--font-bebas-neue)"
              : value === "anton"
                ? "var(--font-anton)"
                : value === "playfair-display"
                  ? "var(--font-playfair-display)"
                  : value === "caveat"
                    ? "var(--font-caveat)"
                    : value === "roboto-mono"
                      ? "var(--font-roboto-mono)"
                      : "var(--font-geist-sans)",
      }
    : undefined

  return (
    <label className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-xl border border-border bg-background px-3 pr-10 text-sm font-medium text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30"
          style={previewFontStyle}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </label>
  )
}

function getFontPreviewStyle(value: string | undefined): CSSProperties {
  return {
    fontFamily:
      value === "montserrat"
        ? "var(--font-montserrat)"
        : value === "bebas-neue"
          ? "var(--font-bebas-neue)"
          : value === "anton"
            ? "var(--font-anton)"
            : value === "playfair-display"
              ? "var(--font-playfair-display)"
              : value === "caveat"
                ? "var(--font-caveat)"
                : value === "roboto-mono"
                  ? "var(--font-roboto-mono)"
                  : "var(--font-geist-sans)",
  }
}

function FontSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  value: string | undefined
}) {
  const selectedOption =
    options.find((option) => option.value === value) ?? options[0]

  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-left text-sm font-medium text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            style={getFontPreviewStyle(selectedOption.value)}
          >
            <span className="truncate">{selectedOption.label}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-border bg-background p-1">
          {options.map((option) => {
            const isSelected = option.value === selectedOption.value

            return (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => onChange(option.value)}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={getFontPreviewStyle(option.value)}
              >
                <span>{option.label}</span>
                {isSelected ? <Check className="size-4 text-foreground" /> : null}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function SliderField({
  label,
  max,
  min,
  onChange,
  suffix,
  value,
}: {
  label: string
  max: number
  min: number
  onChange: (value: number) => void
  suffix: string
  value: number
}) {
  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3">
        <div className="flex h-10 items-center rounded-xl border border-border bg-background px-3">
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            className="w-full bg-transparent text-sm font-medium text-foreground outline-none"
          />
          <span className="ml-2 text-xs font-medium text-muted-foreground">{suffix}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-foreground"
        />
      </div>
    </div>
  )
}

function ColorField({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-2">
        <label className="relative flex h-10 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <span
            className="size-7 rounded-lg border border-white/10"
            style={{ backgroundColor: value }}
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30"
        />
      </div>
    </div>
  )
}

function TextInspector({
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
                updateTextLayerStyle(layer.id, {
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
                updateTextLayerStyle(layer.id, {
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
                updateTextLayerStyle(layer.id, {
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
                updateTextLayerStyle(layer.id, {
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
                  onClick={() => updateTextLayerStyle(layer.id, { textAlign: "left" })}
                >
                  <AlignLeft className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant={layer.textAlign === "center" ? "default" : "ghost"}
                  size="sm"
                  aria-label="Align center"
                  onClick={() => updateTextLayerStyle(layer.id, { textAlign: "center" })}
                >
                  <AlignCenter className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant={layer.textAlign === "right" ? "default" : "ghost"}
                  size="sm"
                  aria-label="Align right"
                  onClick={() => updateTextLayerStyle(layer.id, { textAlign: "right" })}
                >
                  <AlignRight className="size-3.5" />
                </Button>
              </div>
            </div>

            <ColorField
              label="Color"
              value={textColor}
              onChange={(value) => updateTextLayerStyle(layer.id, { textColor: value })}
            />
            <ColorField
              label="Background"
              value={backgroundColor}
              onChange={(value) =>
                updateTextLayerStyle(layer.id, {
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
                updateTextLayerStyle(layer.id, {
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
                updateTextLayerStyle(layer.id, {
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
                updateTextLayerStyle(layer.id, {
                  animationName: value as typeof layer.animationName,
                })
              }
            />
            <StyleSelect
              label="By"
              value={layer.animationBy}
              options={studioTextAnimationByOptions}
              onChange={(value) =>
                updateTextLayerStyle(layer.id, {
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
                updateTextLayerStyle(layer.id, {
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

function TypeIcon() {
  return <TextIcon className="size-4" />
}

function DefaultInspector({ selectedItem }: { selectedItem: StudioSelection }) {
  return (
    <>
      <section className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Selection
        </p>
        <div className="mt-3 space-y-2">
          <span className="inline-flex rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {getSelectionBadge(selectedItem.kind)}
          </span>
          <p className="text-sm font-medium text-foreground">{selectedItem.label}</p>
          <p className="text-sm text-muted-foreground">{selectedItem.summary}</p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Details
        </p>
        <div className="mt-3 space-y-2">
          <div className="rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            {selectedItem.kind === "source" ? "Ready in canvas" : selectedItem.detail}
          </div>
          {selectedItem.kind === "segment" ? (
            <div className="rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              {selectedItem.trackLabel}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Actions
        </p>
        <div className="mt-3 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          Position
        </div>
      </section>
    </>
  )
}

export function StudioInspector() {
  const { selectedItem } = useStudioEditor()

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Inspector</p>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
        {selectedItem.kind === "layer" && selectedItem.layer.kind === "text" ? (
          <TextInspector layer={selectedItem.layer} />
        ) : selectedItem.kind === "media" ? (
          <MediaInspector media={selectedItem.media} />
        ) : (
          <DefaultInspector selectedItem={selectedItem} />
        )}
      </div>
    </aside>
  )
}
