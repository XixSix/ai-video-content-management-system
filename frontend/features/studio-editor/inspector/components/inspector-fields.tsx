"use client"

import { useRef, useState } from "react"
import type { ReactNode, RefObject } from "react"
import { Check, ChevronDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getChapterTimeParts } from "@/features/studio-editor/inspector/lib/chapter-time"
import { getFontPreviewStyle } from "@/features/studio-editor/inspector/lib/style-preview"

type ChapterTimeParts = {
  hours: string
  minutes: string
  seconds: string
}

export function SegmentedTimeInput({
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
    nextRef?: RefObject<HTMLInputElement | null>
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

export function ControlRow({
  control,
  label,
  value,
}: {
  control?: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)_3.5rem] items-center gap-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex min-w-0 items-center gap-3">
        {control ? <div className="shrink-0">{control}</div> : null}
        <div className="relative h-1 min-w-0 flex-1 rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-foreground/85"
            style={{ width: value === "100 %" ? "62%" : value === "1.0 x" ? "34%" : "3%" }}
          />
          <div
            className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-foreground"
            style={{ left: value === "100 %" ? "62%" : value === "1.0 x" ? "34%" : "3%" }}
          />
        </div>
      </div>
      <span className="rounded-lg border border-border bg-background px-2 py-1 text-right text-xs font-medium text-foreground">
        {value}
      </span>
    </div>
  )
}

export function SelectRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)_3.5rem] items-center gap-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <button
        type="button"
        className="flex h-8 min-w-0 items-center justify-between rounded-lg border border-border bg-background px-2 text-left text-xs font-medium text-foreground"
      >
        <span className="truncate">None</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>
      <span className="rounded-lg border border-border bg-background px-2 py-1 text-right text-xs font-medium text-muted-foreground">
        {value}
      </span>
    </div>
  )
}

export function StyleSelect({
  label,
  onChange,
  options,
  previewFont,
  value,
}: {
  label: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  previewFont?: boolean
  value: string | undefined
}) {
  return (
    <label className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-xl border border-border bg-background px-3 pr-10 text-sm font-medium text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30"
          style={previewFont ? getFontPreviewStyle(value) : undefined}
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

export function FontSelect({
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
  const selectedOption = options.find((option) => option.value === value) ?? options[0]

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
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-border bg-background p-1"
        >
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

export function SliderField({
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

export function ColorField({
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
