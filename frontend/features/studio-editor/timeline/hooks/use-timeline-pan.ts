"use client"

import { useState } from "react"
import type { PointerEvent as ReactPointerEvent, RefObject } from "react"

export function useTimelinePan({
  seekToTimelineClientX,
  timelineViewportRef,
}: {
  seekToTimelineClientX: (clientX: number) => void
  timelineViewportRef: RefObject<HTMLDivElement | null>
}) {
  const [isPanningTimeline, setIsPanningTimeline] = useState(false)

  const handleTimelinePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0) {
      return
    }

    const targetElement = event.target as HTMLElement
    if (targetElement.closest("button,input,[data-timeline-segment='true']")) {
      return
    }

    const viewportElement = timelineViewportRef.current
    const startClientX = event.clientX
    const startScrollLeft = viewportElement?.scrollLeft ?? 0
    let hasPanned = false

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startClientX

      if (!hasPanned && Math.abs(deltaX) < 8) {
        return
      }

      moveEvent.preventDefault()
      hasPanned = true
      setIsPanningTimeline(true)

      if (viewportElement) {
        viewportElement.scrollLeft = startScrollLeft - deltaX
      }
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (hasPanned) {
        upEvent.preventDefault()
      } else {
        seekToTimelineClientX(upEvent.clientX)
      }

      setIsPanningTimeline(false)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
  }

  return {
    handleTimelinePointerDown,
    isPanningTimeline,
  }
}
