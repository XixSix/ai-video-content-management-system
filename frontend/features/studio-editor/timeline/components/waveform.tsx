"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { resampleWaveformPeaks } from "@/features/media-library/lib/media-previews"
import { cn } from "@/lib/utils"

const WAVEFORM_TARGET_BAR_SLOT_WIDTH = 4
const WAVEFORM_MIN_BAR_COUNT = 24
const WAVEFORM_MAX_BAR_COUNT = 1200

export function TimelineWaveform({
  className,
  peaks,
}: {
  className: string
  peaks?: number[] | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const barCount = Math.min(
    WAVEFORM_MAX_BAR_COUNT,
    Math.max(
      WAVEFORM_MIN_BAR_COUNT,
      Math.ceil(containerWidth / WAVEFORM_TARGET_BAR_SLOT_WIDTH)
    )
  )
  const bars = useMemo(
    () => (peaks && peaks.length > 0 ? resampleWaveformPeaks(peaks, barCount) : []),
    [barCount, peaks]
  )

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const updateWidth = () => {
      setContainerWidth(container.getBoundingClientRect().width)
    }
    const resizeObserver = new ResizeObserver(updateWidth)

    updateWidth()
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [])

  if (bars.length < 1) {
    return (
      <div
        ref={containerRef}
        className="flex h-full w-full items-center overflow-hidden px-1"
      >
        <span className={cn("h-px w-full opacity-35", className)} />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="grid h-full w-full items-end gap-px overflow-hidden px-0.5"
      style={{
        gridTemplateColumns: `repeat(${barCount}, minmax(1px, 1fr))`,
      }}
    >
      {bars.map((peak, barIndex) => (
        <span
          key={barIndex}
          className={cn("min-h-0.5 w-full", className)}
          style={{
            height: `${Math.max(3, Math.round(peak * 100))}%`,
          }}
        />
      ))}
    </div>
  )
}
