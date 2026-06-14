"use client"

import type { CSSProperties } from "react"
import { useRef, useState } from "react"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Clapperboard,
  Captions,
  Check,
  ChevronDown,
  FileText,
  Film,
  ImageIcon,
  Italic,
  MoreHorizontal,
  Music2,
  Type as TextIcon,
  Underline,
  Volume2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useLongToShortStore } from "@/features/long-to-short/long-to-short.store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DEFAULT_CAPTION_STROKE_WIDTH,
  studioCaptionPresets,
} from "@/features/studio-editor/studio-caption-presets"
import {
  studioTextAnimationByOptions,
  studioTextAnimationOptions,
  studioTextFontOptions,
} from "@/features/studio-editor/studio.data"
import { useStudioEditor } from "@/features/studio-editor/studio-editor-context"
import type {
  StudioChapter,
  StudioProjectMediaItem,
  StudioProjectMediaType,
  StudioSelection,
  StudioTranscriptSegment,
} from "@/features/studio-editor/studio.types"
import { cn } from "@/lib/utils"

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

function formatChapterTime(timeSeconds: number) {
  const totalSeconds = Math.max(0, Math.floor(timeSeconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function getChapterTimeParts(timeSeconds: number) {
  const totalSeconds = Math.max(0, Math.floor(timeSeconds))

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

function formatChapterRange(chapter: StudioChapter) {
  return `${formatChapterTime(chapter.startTime)} - ${formatChapterTime(chapter.endTime)}`
}

function getChapterDuration(chapter: StudioChapter) {
  return formatChapterTime(Math.max(0, chapter.endTime - chapter.startTime))
}

function getChapterTranscriptPreview(
  chapter: StudioChapter,
  segments: StudioTranscriptSegment[]
) {
  return segments
    .filter((segment) => {
      return segment.startTime < chapter.endTime && segment.endTime > chapter.startTime
    })
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(" ")
}

type ChapterTimeParts = {
  hours: string
  minutes: string
  seconds: string
}

function SegmentedTimeInput({
  label,
  maxSeconds,
  minSeconds,
  onCommit,
  valueSeconds,
}: {
  label: string
  maxSeconds: number
  minSeconds: number
  onCommit: (valueSeconds: number) => void
  valueSeconds: number
}) {
  const initialParts = getChapterTimeParts(valueSeconds)
  const [parts, setParts] = useState<ChapterTimeParts>({
    hours: String(initialParts.hours),
    minutes: String(initialParts.minutes).padStart(2, "0"),
    seconds: String(initialParts.seconds).padStart(2, "0"),
  })
  const hoursRef = useRef<HTMLInputElement>(null)
  const minutesRef = useRef<HTMLInputElement>(null)
  const secondsRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLLabelElement>(null)

  const resetParts = () => {
    const nextParts = getChapterTimeParts(valueSeconds)

    setParts({
      hours: String(nextParts.hours),
      minutes: String(nextParts.minutes).padStart(2, "0"),
      seconds: String(nextParts.seconds).padStart(2, "0"),
    })
  }

  const commitParts = () => {
    const nextHours = Number(parts.hours || "0")
    const nextMinutes = Number(parts.minutes || "0")
    const nextSeconds = Number(parts.seconds || "0")

    if (
      !Number.isFinite(nextHours) ||
      !Number.isFinite(nextMinutes) ||
      !Number.isFinite(nextSeconds)
    ) {
      resetParts()
      return
    }

    const normalizedSeconds = Math.min(
      maxSeconds,
      Math.max(
        minSeconds,
        Math.max(0, nextHours) * 3600 +
          Math.max(0, nextMinutes) * 60 +
          Math.max(0, nextSeconds)
      )
    )

    onCommit(normalizedSeconds)

    const normalizedParts = getChapterTimeParts(normalizedSeconds)

    setParts({
      hours: String(normalizedParts.hours),
      minutes: String(normalizedParts.minutes).padStart(2, "0"),
      seconds: String(normalizedParts.seconds).padStart(2, "0"),
    })
  }

  const updatePart = (
    key: keyof ChapterTimeParts,
    value: string,
    nextRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    const digitsOnly = value.replace(/\D/g, "")
    const nextValue = key === "hours" ? digitsOnly.slice(0, 3) : digitsOnly.slice(0, 2)

    setParts((currentParts) => ({
      ...currentParts,
      [key]: nextValue,
    }))

    if (key !== "hours" && nextValue.length === 2 && nextRef?.current) {
      nextRef.current.focus()
      nextRef.current.select()
    }
  }

  return (
    <label
      ref={containerRef}
      className="flex min-h-10 min-w-0 items-center rounded-xl border border-border bg-background px-3 py-2"
      onBlur={(event) => {
        if (containerRef.current?.contains(event.relatedTarget as Node | null)) {
          return
        }

        commitParts()
      }}
    >
      <div className="flex w-full min-w-0 items-center justify-between gap-2">
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        <div className="flex shrink-0 items-center gap-0.5 font-mono text-xs font-semibold tabular-nums text-foreground">
          <input
            ref={hoursRef}
            type="text"
            inputMode="numeric"
            value={parts.hours}
            onChange={(event) => updatePart("hours", event.target.value, minutesRef)}
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur()
              }
            }}
            className="h-5 w-[1.35rem] bg-transparent text-center outline-none"
          />
          <span className="text-muted-foreground">:</span>
          <input
            ref={minutesRef}
            type="text"
            inputMode="numeric"
            value={parts.minutes}
            onChange={(event) => updatePart("minutes", event.target.value, secondsRef)}
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur()
              }
            }}
            className="h-5 w-[1.15rem] bg-transparent text-center outline-none"
          />
          <span className="text-muted-foreground">:</span>
          <input
            ref={secondsRef}
            type="text"
            inputMode="numeric"
            value={parts.seconds}
            onChange={(event) => updatePart("seconds", event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur()
              }
            }}
            className="h-5 w-[1.15rem] bg-transparent text-center outline-none"
          />
        </div>
      </div>
    </label>
  )
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
        : value === "poppins"
          ? "var(--font-poppins)"
          : value === "oswald"
            ? "var(--font-oswald)"
            : value === "teko"
              ? "var(--font-teko)"
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
  step = 1,
  suffix,
  value,
}: {
  label: string
  max: number
  min: number
  onChange: (value: number) => void
  step?: number
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
            step={step}
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
          step={step}
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

function getCaptionPreviewTextStyle(style: {
  backgroundEnabled?: boolean
  fontFamily?: string
  fontSize?: number
  fontStyle?: string
  fontWeight?: string
  highlightEnabled?: boolean
  highlightColor?: string
  shadowEnabled?: boolean
  shadowStyle?: "soft" | "hard"
  strokeEnabled?: boolean
  strokeColor?: string
  strokeWidth?: number
  textColor?: string
  textDecoration?: string
  textTransform?: string
}): CSSProperties {
  return {
    WebkitTextStroke: style.strokeEnabled
      ? `${style.strokeWidth ?? 0}px ${style.strokeColor ?? "#000000"}`
      : undefined,
    color: style.textColor,
    fontFamily: getFontPreviewStyle(style.fontFamily).fontFamily,
    fontSize: style.fontSize ? Math.max(15, style.fontSize - 2) : 18,
    fontStyle: style.fontStyle === "italic" ? "italic" : undefined,
    fontWeight: style.fontWeight === "bold" ? 700 : 500,
    borderBottom:
      style.textDecoration === "underline"
        ? `2px solid ${style.textColor ?? "#ffffff"}`
        : undefined,
    paddingBottom: style.textDecoration === "underline" ? "0.06em" : undefined,
    textShadow: style.shadowEnabled
      ? style.shadowStyle === "hard"
        ? "0 2px 0 rgba(0,0,0,0.45), 0 0 14px rgba(0,0,0,0.28)"
        : "0 1px 10px rgba(0,0,0,0.26)"
      : undefined,
    textTransform: style.textTransform === "uppercase" ? "uppercase" : undefined,
  }
}

function getCaptionPreviewChipStyle(style: {
  backgroundEnabled?: boolean
  backgroundColor?: string
  backgroundRadius?: number
  enabled?: boolean
}): CSSProperties {
  return {
    backgroundColor:
      style.enabled && style.backgroundEnabled !== false
        ? style.backgroundColor ?? "#111111"
        : "transparent",
    borderRadius: style.backgroundRadius ?? 16,
    paddingBlock: "0.38rem",
    paddingInline: "0.7rem",
  }
}

function CaptionInspector({
  layer,
}: {
  layer: Extract<StudioSelection, { kind: "layer" }>["layer"]
}) {
  const { applyCaptionPreset, updateCaptionLayerStyle } = useStudioEditor()
  const [activeTab, setActiveTab] = useState<"presets" | "font" | "effects">("presets")
  const fontSize = layer.fontSize ?? 22
  const textColor = layer.textColor ?? "#ffffff"
  const backgroundColor = layer.backgroundColor ?? "#111111"
  const backgroundEnabled = layer.backgroundEnabled !== false
  const highlightColor = layer.highlightColor ?? "#3bff68"
  const strokeColor = layer.strokeColor ?? "#000000"
  const strokeWidth = Number((layer.strokeWidth ?? 1).toFixed(1))

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
            {[
              { id: "presets", label: "Presets" },
              { id: "font", label: "Font" },
              { id: "effects", label: "Effects" },
            ].map((tab) => (
              <Button
                key={tab.id}
                type="button"
                size="sm"
                variant={activeTab === tab.id ? "default" : "ghost"}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className="h-8"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-5 p-4">
          {activeTab === "presets" ? (
            <div className="grid grid-cols-2 gap-3">
              {studioCaptionPresets.map((preset) => {
                const isActive = layer.presetId === preset.id

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyCaptionPreset(preset.id)}
                    className={cn(
                      "rounded-xl border bg-background p-2 text-left transition",
                      isActive
                        ? "border-foreground/40 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                        : "border-border hover:border-foreground/20"
                    )}
                  >
                    <div
                      className="flex aspect-[1.08] items-center justify-center rounded-lg bg-[#121212] px-3 text-center"
                    >
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
          ) : null}

          {activeTab === "font" ? (
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
                      onClick={() => updateCaptionLayerStyle({ enabled: true })}
                    >
                      On
                    </Button>
                    <Button
                      type="button"
                      variant={layer.enabled === false ? "default" : "ghost"}
                      size="sm"
                      onClick={() => updateCaptionLayerStyle({ enabled: false })}
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
                    updateCaptionLayerStyle({
                      fontFamily: value as typeof layer.fontFamily,
                    })
                  }
                />
                <ColorField
                  label="Color"
                  value={textColor}
                  onChange={(value) => updateCaptionLayerStyle({ textColor: value })}
                />
                <SliderField
                  label="Size"
                  min={14}
                  max={40}
                  value={fontSize}
                  suffix="px"
                  onChange={(value) => updateCaptionLayerStyle({ fontSize: value })}
                />
                <StyleSelect
                  label="Weight"
                  value={layer.fontWeight}
                  options={[
                    { label: "Regular", value: "regular" },
                    { label: "Bold", value: "bold" },
                  ]}
                  onChange={(value) =>
                    updateCaptionLayerStyle({
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
                        updateCaptionLayerStyle({
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
                        updateCaptionLayerStyle({
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
                      onClick={() => updateCaptionLayerStyle({ textTransform: "none" })}
                    >
                      Off
                    </Button>
                    <Button
                      type="button"
                      variant={layer.textTransform === "uppercase" ? "default" : "ghost"}
                      size="sm"
                      onClick={() =>
                        updateCaptionLayerStyle({
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
                      onClick={() => updateCaptionLayerStyle({ backgroundEnabled: true })}
                    >
                      On
                    </Button>
                    <Button
                      type="button"
                      variant={backgroundEnabled ? "ghost" : "default"}
                      size="sm"
                      onClick={() => updateCaptionLayerStyle({ backgroundEnabled: false })}
                    >
                      Off
                    </Button>
                  </div>
                </div>
                <ColorField
                  label="Fill"
                  value={backgroundColor}
                  onChange={(value) => updateCaptionLayerStyle({ backgroundColor: value })}
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
                        updateCaptionLayerStyle({
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
                        updateCaptionLayerStyle({
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
                  onChange={(value) => updateCaptionLayerStyle({ strokeColor: value })}
                />
                <SliderField
                  label="Width"
                  min={0}
                  max={4}
                  value={strokeWidth}
                  step={0.1}
                  suffix="px"
                  onChange={(value) =>
                    updateCaptionLayerStyle({
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
                      onClick={() => updateCaptionLayerStyle({ shadowEnabled: true })}
                    >
                      On
                    </Button>
                    <Button
                      type="button"
                      variant={layer.shadowEnabled ? "ghost" : "default"}
                      size="sm"
                      onClick={() => updateCaptionLayerStyle({ shadowEnabled: false })}
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
                    updateCaptionLayerStyle({
                      shadowStyle: value as typeof layer.shadowStyle,
                    })
                  }
                />
              </div>
            </div>
          ) : null}

          {activeTab === "effects" ? (
            <div className="space-y-4">
              <StyleSelect
                label="Preset"
                value={layer.animationName}
                options={studioTextAnimationOptions}
                onChange={(value) =>
                  updateCaptionLayerStyle({
                    animationName: value as typeof layer.animationName,
                  })
                }
              />
              <StyleSelect
                label="By"
                value={layer.animationBy}
                options={studioTextAnimationByOptions}
                onChange={(value) =>
                  updateCaptionLayerStyle({
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
                  updateCaptionLayerStyle({
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
                      onClick={() => updateCaptionLayerStyle({ highlightEnabled: true })}
                    >
                      On
                    </Button>
                    <Button
                      type="button"
                      variant={layer.highlightEnabled ? "ghost" : "default"}
                      size="sm"
                      onClick={() => updateCaptionLayerStyle({ highlightEnabled: false })}
                    >
                      Off
                    </Button>
                  </div>
                </div>
                <ColorField
                  label="Color"
                  value={highlightColor}
                  onChange={(value) =>
                    updateCaptionLayerStyle({
                      highlightColor: value,
                    })
                  }
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  )
}

function ChapterInspector({ chapter }: { chapter: StudioChapter }) {
  const openLongToShort = useLongToShortStore((state) => state.openManager)
  const {
    project,
    seekToTime,
    updateChapterTiming,
    updateChapterTitle,
  } = useStudioEditor()
  const [titleDraft, setTitleDraft] = useState(chapter.title)
  const transcriptPreview = getChapterTranscriptPreview(
    chapter,
    project.transcriptSegments
  )

  const commitTitle = () => {
    const nextTitle = titleDraft.trim()

    setTitleDraft(nextTitle)
    updateChapterTitle(chapter.id, nextTitle)
  }
  const minimumChapterDurationSeconds =
    project.media.durationSeconds >= 1 ? 1 : 0

  return (
    <>
      <section className="rounded-xl border border-border bg-surface-muted px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Selection
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
            <Clapperboard className="size-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-sm font-medium text-foreground">
                Chapter {String(chapter.chapterIndex).padStart(2, "0")}:
              </span>
              <input
                type="text"
                value={titleDraft}
                placeholder="Title goes here"
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={commitTitle}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") {
                    return
                  }

                  event.currentTarget.blur()
                }}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatChapterRange(chapter)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Transcript preview</p>
        </div>

        <div className="p-4">
          <div className="max-h-40 overflow-y-auto rounded-xl border border-border bg-background/85 px-3 py-3 text-xs leading-6 text-muted-foreground">
            {transcriptPreview || "No transcript text overlaps this chapter yet."}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Timing</p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(148px,1fr))] gap-2 p-4">
          <SegmentedTimeInput
            key={`start-${chapter.id}-${chapter.startTime}-${chapter.endTime}`}
            label="Start"
            valueSeconds={chapter.startTime}
            minSeconds={0}
            maxSeconds={Math.max(0, chapter.endTime - minimumChapterDurationSeconds)}
            onCommit={(valueSeconds) =>
              updateChapterTiming(chapter.id, { startTime: valueSeconds })
            }
          />
          <SegmentedTimeInput
            key={`end-${chapter.id}-${chapter.startTime}-${chapter.endTime}`}
            label="End"
            valueSeconds={chapter.endTime}
            minSeconds={Math.min(
              project.media.durationSeconds,
              chapter.startTime + minimumChapterDurationSeconds
            )}
            maxSeconds={project.media.durationSeconds}
            onCommit={(valueSeconds) =>
              updateChapterTiming(chapter.id, { endTime: valueSeconds })
            }
          />
          <div className="flex min-h-10 min-w-0 items-center rounded-xl border border-border bg-background px-3 py-2">
            <div className="flex w-full min-w-0 items-center justify-between gap-2">
              <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Duration
              </span>
              <div className="inline-flex h-5 shrink-0 items-center font-mono text-xs font-semibold tabular-nums text-foreground">
                {getChapterDuration(chapter)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Actions
        </p>
        <div className="mt-3 grid gap-2">
          <Button
            type="button"
            size="sm"
            className="justify-start"
            onClick={() => seekToTime(chapter.startTime)}
          >
            Seek to chapter
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={openLongToShort}
          >
            Open in Long to Short
          </Button>
        </div>
      </section>
    </>
  )
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
  const {
    activeTool,
    project,
    selectedChapterId,
    selectedItem,
  } = useStudioEditor()
  const selectedChapter =
    project.chapters.find((chapter) => chapter.id === selectedChapterId) ?? null

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Inspector</p>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
        {activeTool === "chapters" && selectedChapter ? (
          <ChapterInspector key={selectedChapter.id} chapter={selectedChapter} />
        ) : selectedItem.kind === "layer" && selectedItem.layer.kind === "text" ? (
          <TextInspector layer={selectedItem.layer} />
        ) : selectedItem.kind === "layer" && selectedItem.layer.kind === "captions" ? (
          <CaptionInspector layer={selectedItem.layer} />
        ) : selectedItem.kind === "media" ? (
          <MediaInspector media={selectedItem.media} />
        ) : (
          <DefaultInspector selectedItem={selectedItem} />
        )}
      </div>
    </aside>
  )
}
