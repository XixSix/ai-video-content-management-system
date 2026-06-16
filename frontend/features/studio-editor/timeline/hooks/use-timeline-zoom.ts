"use client"

import { useCallback, useEffect, useState } from "react"
import type { RefObject } from "react"

import {
  TIMELINE_BUTTON_ZOOM_MULTIPLIER,
  TIMELINE_PINCH_ZOOM_SENSITIVITY,
} from "../constants"
import { clampTimelineZoom } from "../lib/time"

export function useTimelineZoom({
  timelineViewportRef,
}: {
  timelineViewportRef: RefObject<HTMLDivElement | null>
}) {
  const [zoomLevel, setZoomLevel] = useState(1)

  const applyZoomLevel = useCallback(
    (nextZoomLevel: number, anchorClientX?: number) => {
      const viewportElement = timelineViewportRef.current
      const previousScrollWidth = viewportElement?.scrollWidth ?? 0
      const viewportOffset =
        viewportElement && typeof anchorClientX === "number"
          ? anchorClientX - viewportElement.getBoundingClientRect().left
          : viewportElement
            ? viewportElement.clientWidth / 2
            : 0
      const scrollRatio =
        viewportElement && previousScrollWidth > 0
          ? (viewportElement.scrollLeft + viewportOffset) / previousScrollWidth
          : null
      const clampedZoomLevel = Number(clampTimelineZoom(nextZoomLevel).toFixed(3))

      setZoomLevel(clampedZoomLevel)

      if (!viewportElement || scrollRatio === null) {
        return
      }

      window.requestAnimationFrame(() => {
        viewportElement.scrollLeft =
          scrollRatio * viewportElement.scrollWidth - viewportOffset
      })
    },
    [timelineViewportRef]
  )

  const updateZoom = (direction: "in" | "out") => {
    applyZoomLevel(
      direction === "in"
        ? zoomLevel * TIMELINE_BUTTON_ZOOM_MULTIPLIER
        : zoomLevel / TIMELINE_BUTTON_ZOOM_MULTIPLIER
    )
  }

  useEffect(() => {
    const viewportElement = timelineViewportRef.current

    if (!viewportElement) {
      return
    }

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return
      }

      event.preventDefault()
      applyZoomLevel(
        zoomLevel * Math.exp(-event.deltaY * TIMELINE_PINCH_ZOOM_SENSITIVITY),
        event.clientX
      )
    }

    viewportElement.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      viewportElement.removeEventListener("wheel", handleWheel)
    }
  }, [applyZoomLevel, timelineViewportRef, zoomLevel])

  return {
    applyZoomLevel,
    updateZoom,
    zoomLevel,
  }
}
