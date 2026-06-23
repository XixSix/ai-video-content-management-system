"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import type { MediaPreviewSpriteSheet } from "@/features/media-library/lib/media-previews"
import { cn } from "@/lib/utils"

const DEFAULT_FRAME_ASPECT_RATIO = 16 / 9
const MAX_DISPLAY_FRAME_COUNT = 240

function getFrameStyle({
  columns,
  displayFrameHeight,
  displayFrameWidth,
  frameIndex,
  rows,
  url,
}: {
  columns: number
  displayFrameHeight: number
  displayFrameWidth: number
  frameIndex: number
  rows: number
  url: string
}) {
  const columnIndex = frameIndex % columns
  const rowIndex = Math.floor(frameIndex / columns)

  return {
    backgroundImage: `url(${url})`,
    backgroundPosition: `-${columnIndex * displayFrameWidth}px -${
      rowIndex * displayFrameHeight
    }px`,
    backgroundSize: `${columns * displayFrameWidth}px ${
      rows * displayFrameHeight
    }px`,
  }
}

function getSpriteSheetTotalFrameCount(spriteSheets: MediaPreviewSpriteSheet[]) {
  const lastFrameIndex = spriteSheets.reduce(
    (maxFrameIndex, sheet) =>
      Math.max(maxFrameIndex, sheet.firstFrameIndex + sheet.frameCount),
    0
  )

  if (lastFrameIndex > 0) {
    return lastFrameIndex
  }

  return spriteSheets.reduce((total, sheet) => total + sheet.frameCount, 0)
}

function resolveSpriteFrameByIndex({
  displayFrameHeight,
  displayFrameWidth,
  globalFrameIndex,
  spriteSheets,
}: {
  displayFrameHeight: number
  displayFrameWidth: number
  globalFrameIndex: number
  spriteSheets: MediaPreviewSpriteSheet[]
}) {
  let runningFrameCount = 0
  const spriteSheet =
    spriteSheets.find((sheet) => {
      const frameStart = Math.max(0, sheet.firstFrameIndex)
      const frameEnd = frameStart + sheet.frameCount

      return globalFrameIndex >= frameStart && globalFrameIndex < frameEnd
    }) ??
    spriteSheets.find((sheet) => {
      const frameEnd = runningFrameCount + sheet.frameCount
      const matches =
        globalFrameIndex >= runningFrameCount && globalFrameIndex < frameEnd

      runningFrameCount = frameEnd

      return matches
    }) ??
    spriteSheets.at(-1)

  if (!spriteSheet) {
    return null
  }

  const relativeFrameIndex = Math.max(
    0,
    Math.min(
      spriteSheet.frameCount - 1,
      globalFrameIndex - Math.max(0, spriteSheet.firstFrameIndex)
    )
  )

  return getFrameStyle({
    url: spriteSheet.url,
    columns: spriteSheet.columns,
    displayFrameHeight,
    displayFrameWidth,
    rows: spriteSheet.rows,
    frameIndex: relativeFrameIndex,
  })
}

export function TimelineThumbnailStrip({
  className,
  frameHeight,
  spriteSheets,
  stripWidth,
  thumbnailUrl,
}: {
  className?: string
  frameHeight: number
  spriteSheets?: MediaPreviewSpriteSheet[]
  stripWidth: number
  thumbnailUrl: string | null | undefined
}) {
  const stripRef = useRef<HTMLDivElement | null>(null)
  const [measuredStripWidth, setMeasuredStripWidth] = useState(0)
  const firstSpriteSheet = spriteSheets?.[0]
  const frameAspectRatio = firstSpriteSheet
    ? firstSpriteSheet.frameWidth / firstSpriteSheet.frameHeight
    : DEFAULT_FRAME_ASPECT_RATIO
  const displayFrameHeight = Math.max(1, frameHeight)
  const displayFrameWidth = Math.max(
    1,
    Math.round(displayFrameHeight * frameAspectRatio)
  )
  const effectiveStripWidth = Math.max(1, measuredStripWidth || stripWidth)
  const frameCount = Math.min(
    MAX_DISPLAY_FRAME_COUNT,
    Math.max(1, Math.ceil(effectiveStripWidth / displayFrameWidth))
  )
  const spriteTotalFrameCount = spriteSheets
    ? getSpriteSheetTotalFrameCount(spriteSheets)
    : 0
  const frames = useMemo(
    () =>
      Array.from({ length: frameCount }).map((_, frameIndex) => {
        if (!spriteSheets || spriteSheets.length < 1 || spriteTotalFrameCount < 1) {
          return {
            backgroundImage: `url(${thumbnailUrl})`,
            backgroundSize: "cover",
          }
        }

        const sampledFrameIndex = Math.min(
          spriteTotalFrameCount - 1,
          Math.floor(((frameIndex + 0.5) / frameCount) * spriteTotalFrameCount)
        )

        return (
          resolveSpriteFrameByIndex({
            displayFrameHeight,
            displayFrameWidth,
            globalFrameIndex: sampledFrameIndex,
            spriteSheets,
          }) ?? {
            backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : undefined,
            backgroundSize: thumbnailUrl ? "cover" : undefined,
          }
        )
      }),
    [
      displayFrameHeight,
      displayFrameWidth,
      frameCount,
      spriteSheets,
      spriteTotalFrameCount,
      thumbnailUrl,
    ]
  )

  useEffect(() => {
    const element = stripRef.current

    if (!element) {
      return
    }

    const updateWidth = () => {
      setMeasuredStripWidth(Math.ceil(element.getBoundingClientRect().width))
    }

    updateWidth()

    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  if (!thumbnailUrl && (!spriteSheets || spriteSheets.length < 1)) {
    return null
  }

  return (
    <div
      ref={stripRef}
      className={cn(
        "flex h-[62%] w-full items-stretch overflow-hidden",
        className
      )}
    >
      {frames.map((frameStyle, thumbnailIndex) => (
        <div
          key={thumbnailIndex}
          className="relative h-full shrink-0 border-r border-black/20 bg-center bg-no-repeat"
          style={{
            ...frameStyle,
            height: displayFrameHeight,
            width: displayFrameWidth,
          }}
        >
          <div className="absolute inset-0 bg-black/[0.06]" />
        </div>
      ))}
    </div>
  )
}
