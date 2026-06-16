"use client"

import { useRef, useState } from "react"
import type { RefObject } from "react"

import { getChapterTimeParts } from "@/features/studio-editor/inspector/lib/chapter-time"

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
    const nextValue =
      key === "hours" ? digitsOnly.slice(0, 3) : digitsOnly.slice(0, 2)

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
            onChange={(event) =>
              updatePart("hours", event.target.value, minutesRef)
            }
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
            onChange={(event) =>
              updatePart("minutes", event.target.value, secondsRef)
            }
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
