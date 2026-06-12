"use client"

import { useEffect, useRef, useState } from "react"

import { useStudioEditor } from "@/features/studio-editor/studio-editor-context"
import { cn } from "@/lib/utils"

const VIDEO_ASPECT_RATIO = 16 / 9
const CANVAS_HORIZONTAL_PADDING = 56
const CANVAS_VERTICAL_PADDING = 48

export function StudioCanvas() {
  const { project, selectedItem, selectedTargetId, setSelectedItemId, setActiveTool } =
    useStudioEditor()
  const isSourceSelected = selectedTargetId === project.sourceMedia.id
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
          currentSize.height === roundedHeight
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

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(125,125,125,0.1),transparent_42%),linear-gradient(180deg,color-mix(in_srgb,var(--background)_92%,black_8%),var(--background))]">
      <div
        ref={canvasAreaRef}
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-7 py-6"
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <div
            data-studio-canvas-preview=""
            onClick={() => {
              setActiveTool("media")
              setSelectedItemId(project.sourceMedia.id)
            }}
            className={cn(
              "relative aspect-video max-h-full max-w-full overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(145deg,#1e7397,#0c4364_55%,#092c43)] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.55)]",
              isSourceSelected ? "ring-2 ring-sky-300/75 ring-offset-0" : null
            )}
            style={{
              height: previewSize?.height,
              width: previewSize?.width ?? "100%",
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.15))]" />
            <div className="absolute left-[11%] top-[19%] size-[24%] rounded-full bg-[rgba(0,0,0,0.16)] blur-3xl" />
            <div className="absolute right-[9%] top-[9%] h-[43%] w-[21%] rounded-[18px] border border-white/12 bg-[rgba(3,10,15,0.28)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
            <div className="absolute left-[16%] top-[28%] h-[56%] w-[18%] rounded-[22px] bg-[rgba(255,255,255,0.18)] blur-[2px]" />
            <div className="absolute right-[10%] top-[34%] h-[48%] w-[20%] rounded-[22px] bg-[rgba(0,0,0,0.18)] blur-[2px]" />

            {project.layers.map((layer) => {
              const isSelected = selectedTargetId === layer.id

              return (
                <button
                  key={layer.id}
                  type="button"
                  aria-label={layer.label}
                  onClick={(event) => {
                    event.stopPropagation()
                    setActiveTool(layer.kind === "text" ? "text" : layer.kind === "captions" ? "captions" : "assets")
                    setSelectedItemId(layer.id)
                  }}
                  className={cn(
                    layer.className,
                    "text-left",
                    isSelected
                      ? "ring-2 ring-sky-300/75 ring-offset-0"
                      : "hover:ring-2 hover:ring-white/20"
                  )}
                >
                  {layer.label}
                </button>
              )
            })}

            {selectedItem.kind !== "source"
              ? project.layers
                  .filter((layer) => layer.id === selectedTargetId)
                  .map((layer) => (
                    <div
                      key={`${layer.id}-frame`}
                      className={layer.frameClassName}
                    >
                      <div className="absolute -left-1.5 -top-1.5 size-3 rounded-full border border-sky-200 bg-sky-400" />
                      <div className="absolute -right-1.5 -top-1.5 size-3 rounded-full border border-sky-200 bg-sky-400" />
                      <div className="absolute -left-1.5 -bottom-1.5 size-3 rounded-full border border-sky-200 bg-sky-400" />
                      <div className="absolute -right-1.5 -bottom-1.5 size-3 rounded-full border border-sky-200 bg-sky-400" />
                    </div>
                  ))
              : null}
          </div>
        </div>
      </div>
    </section>
  )
}
