import { useRef } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"

import { TextAnimate } from "@/components/ui/text-animate"
import { cn } from "@/lib/utils"

import type {
  StudioCanvasLayer,
  StudioCaptionCue,
} from "../../studio.types"
import { isWordGroupActive } from "../lib/caption-activity"
import {
  getCaptionContainerStyle,
  getTextLayerClassName,
  getTextLayerStyle,
} from "../lib/layer-style"
import { CaptionWord } from "./caption-word"

const CANVAS_CENTER_SNAP_THRESHOLD_PX = 6

export function CanvasLayer({
  activeCue,
  currentTime,
  isSelected,
  layer,
  onLayerDragGuideChange,
  onMoveLayer,
  onSelect,
  renderPreviewContent = true,
}: {
  activeCue: StudioCaptionCue | null
  currentTime: number
  isSelected: boolean
  layer: StudioCanvasLayer
  onLayerDragGuideChange: (guide: {
    horizontal: boolean
    vertical: boolean
  } | null) => void
  onMoveLayer: (
    layerId: string,
    position: {
      xPercent: number
      yPercent: number
    },
    options?: {
      recordHistory?: boolean
    }
  ) => void
  onSelect: (layer: StudioCanvasLayer) => void
  renderPreviewContent?: boolean
}) {
  const didDragRef = useRef(false)

  if (
    layer.visible === false ||
    (layer.kind === "captions" && !layer.enabled)
  ) {
    return null
  }

  const handleLayerPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    if (
      event.button !== 0 ||
      (layer.kind !== "text" && layer.kind !== "captions")
    ) {
      return
    }

    event.stopPropagation()
    onSelect(layer)

    const layerElement = event.currentTarget
    const previewElement = layerElement.parentElement

    if (!previewElement) {
      return
    }

    const previewRect = previewElement.getBoundingClientRect()
    const layerRect = layerElement.getBoundingClientRect()
    const initialXPercent =
      typeof layer.xPercent === "number"
        ? layer.xPercent
        : ((layerRect.left + layerRect.width / 2 - previewRect.left) /
            previewRect.width) *
          100
    const initialYPercent =
      typeof layer.yPercent === "number"
        ? layer.yPercent
        : ((layerRect.top + layerRect.height / 2 - previewRect.top) /
            previewRect.height) *
          100
    const layerWidthPercent = (layerRect.width / previewRect.width) * 100
    const layerHeightPercent = (layerRect.height / previewRect.height) * 100
    const startClientX = event.clientX
    const startClientY = event.clientY
    let hasDragged = false
    let hasRecordedHistory = false

    const clampAxis = (value: number, sizePercent: number) => {
      const halfSizePercent = sizePercent / 2
      const startBound = halfSizePercent
      const endBound = 100 - halfSizePercent
      const minBound = Math.min(startBound, endBound)
      const maxBound = Math.max(startBound, endBound)

      return Math.min(maxBound, Math.max(minBound, value))
    }

    const clampPosition = ({
      xPercent,
      yPercent,
    }: {
      xPercent: number
      yPercent: number
    }) => ({
      xPercent: clampAxis(xPercent, layerWidthPercent),
      yPercent: clampAxis(yPercent, layerHeightPercent),
    })

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startClientX
      const deltaY = moveEvent.clientY - startClientY

      if (!hasDragged && Math.hypot(deltaX, deltaY) < 4) {
        return
      }

      moveEvent.preventDefault()
      hasDragged = true
      didDragRef.current = true

      const unsnappedPosition = clampPosition({
        xPercent: initialXPercent + (deltaX / previewRect.width) * 100,
        yPercent: initialYPercent + (deltaY / previewRect.height) * 100,
      })
      const layerCenterX = (unsnappedPosition.xPercent / 100) * previewRect.width
      const layerCenterY = (unsnappedPosition.yPercent / 100) * previewRect.height
      const shouldSnapVertical =
        Math.abs(layerCenterX - previewRect.width / 2) <=
        CANVAS_CENTER_SNAP_THRESHOLD_PX
      const shouldSnapHorizontal =
        Math.abs(layerCenterY - previewRect.height / 2) <=
        CANVAS_CENTER_SNAP_THRESHOLD_PX
      const nextPosition = clampPosition({
        xPercent: shouldSnapVertical ? 50 : unsnappedPosition.xPercent,
        yPercent: shouldSnapHorizontal ? 50 : unsnappedPosition.yPercent,
      })

      onLayerDragGuideChange(
        shouldSnapHorizontal || shouldSnapVertical
          ? {
              horizontal: shouldSnapHorizontal,
              vertical: shouldSnapVertical,
            }
          : null
      )

      onMoveLayer(layer.id, nextPosition, {
        recordHistory: !hasRecordedHistory,
      })
      hasRecordedHistory = true
    }

    const cleanup = () => {
      onLayerDragGuideChange(null)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerCancel)
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (hasDragged) {
        upEvent.preventDefault()
      }

      cleanup()
    }

    const handlePointerCancel = () => {
      cleanup()
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerCancel)
  }

  return (
    <button
      type="button"
      aria-label={layer.label}
      onPointerDown={handleLayerPointerDown}
      onClick={(event) => {
        event.stopPropagation()

        if (didDragRef.current) {
          didDragRef.current = false
          return
        }

        onSelect(layer)
      }}
      className={cn(
        layer.className,
        "text-left",
        layer.kind === "text"
          ? cn("z-20", getTextLayerClassName(layer.backgroundStyle))
          : layer.kind === "captions"
            ? "z-30 flex items-center justify-center"
            : null,
        !renderPreviewContent ? "z-40 bg-transparent shadow-none" : null,
        isSelected
          ? "ring-2 ring-sky-300/75 ring-offset-0"
          : "hover:ring-2 hover:ring-white/20",
        layer.kind === "text" || layer.kind === "captions" ? "cursor-move" : null
      )}
      style={
        layer.kind === "text"
          ? {
              ...getTextLayerStyle(layer),
              ...(renderPreviewContent
                ? {}
                : {
                    backgroundColor: "transparent",
                    color: "transparent",
                  }),
            }
          : layer.kind === "captions"
            ? {
                ...getCaptionContainerStyle(layer),
                ...(renderPreviewContent
                  ? {}
                  : {
                      backgroundColor: "transparent",
                      color: "transparent",
                    }),
              }
            : undefined
      }
    >
      {layer.kind === "text" ? (
        !renderPreviewContent ? (
          <span className="invisible block whitespace-pre-wrap">
            {layer.content ?? layer.label}
          </span>
        ) : layer.animationName && layer.animationName !== "none" ? (
          <TextAnimate
            key={`${layer.id}-${layer.animationName}-${layer.animationBy}-${layer.animationDuration}-${layer.content ?? ""}`}
            animation={layer.animationName}
            by={layer.animationBy}
            duration={layer.animationDuration}
            as="span"
            startOnView={false}
            className="block whitespace-pre-wrap"
            segmentClassName="whitespace-pre-wrap"
          >
            {layer.content ?? layer.label}
          </TextAnimate>
        ) : (
          <span className="block whitespace-pre-wrap">
            {layer.content ?? layer.label}
          </span>
        )
      ) : layer.kind === "captions" ? (
        activeCue ? (
          <span
            className={cn(
              "block max-w-full text-center leading-[1.02]",
              !renderPreviewContent ? "invisible" : null
            )}
          >
            {activeCue.wordGroups.map((wordGroup, index) => (
              <CaptionWord
                key={wordGroup.id}
                index={index}
                isActive={isWordGroupActive(wordGroup, currentTime)}
                layer={layer}
                wordGroup={wordGroup}
              />
            ))}
          </span>
        ) : null
      ) : (
        layer.label
      )}
    </button>
  )
}
