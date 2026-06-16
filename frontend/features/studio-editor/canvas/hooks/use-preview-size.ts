"use client"

import { useEffect, useRef, useState } from "react"

import {
  CANVAS_HORIZONTAL_PADDING,
  CANVAS_VERTICAL_PADDING,
  VIDEO_ASPECT_RATIO,
} from "../constants"

export function usePreviewSize() {
  const canvasAreaRef = useRef<HTMLDivElement>(null)
  const [previewSize, setPreviewSize] = useState<{
    height: number
    width: number
  } | null>(null)

  useEffect(() => {
    const canvasArea = canvasAreaRef.current

    if (!canvasArea) {
      return
    }

    const updatePreviewSize = () => {
      const { height, width } = canvasArea.getBoundingClientRect()
      const availableHeight = Math.max(0, height - CANVAS_VERTICAL_PADDING)
      const availableWidth = Math.max(0, width - CANVAS_HORIZONTAL_PADDING)
      const nextWidth = Math.max(
        0,
        Math.min(availableWidth, availableHeight * VIDEO_ASPECT_RATIO)
      )
      const nextHeight = nextWidth / VIDEO_ASPECT_RATIO

      setPreviewSize((currentSize) => {
        const roundedWidth = Math.round(nextWidth)
        const roundedHeight = Math.round(nextHeight)

        if (
          currentSize?.width === roundedWidth &&
          currentSize?.height === roundedHeight
        ) {
          return currentSize
        }

        return {
          height: roundedHeight,
          width: roundedWidth,
        }
      })
    }

    updatePreviewSize()

    const resizeObserver = new ResizeObserver(updatePreviewSize)
    resizeObserver.observe(canvasArea)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return {
    canvasAreaRef,
    previewSize,
  }
}
