import type { PointerEvent as ReactPointerEvent } from "react"
import { useRef } from "react"

import { cn } from "@/lib/utils"

import type {
  ActiveCompositionSegment,
  StudioCompositionFrame,
} from "../lib/composition"
import {
  getLayerCanvasGeometry,
  getOverlaySegmentCanvasGeometry,
  moveCanvasGeometry,
  resizeCanvasGeometry,
  type StudioCanvasGeometry,
} from "../lib/geometry"
import type {
  StudioCanvasLayer,
  StudioCaptionCue,
  StudioTimelineSegment,
} from "../../studio.types"
import { getActiveCaptionCue } from "../lib/caption-activity"

const CANVAS_CENTER_SNAP_THRESHOLD_PX = 6

type OverlayItem =
  | {
      id: string
      geometry: StudioCanvasGeometry
      isSelected: boolean
      kind: "layer"
      label: string
      layer: StudioCanvasLayer
      tone: "caption" | "text"
    }
  | {
      id: string
      geometry: StudioCanvasGeometry
      isSelected: boolean
      kind: "segment"
      label: string
      segment: StudioTimelineSegment
      tone: "overlay"
    }

type GeometryUpdateOptions = {
  recordHistory?: boolean
}

export function EditorOverlayLayerList({
  captionCues,
  compositionFrame,
  currentTime,
  layers,
  onLayerDragGuideChange,
  onLayerGeometryChange,
  onSelectLayer,
  onSelectOverlaySegment,
  onSegmentGeometryChange,
  selectedItemId,
  selectedTargetId,
}: {
  captionCues: StudioCaptionCue[]
  compositionFrame: StudioCompositionFrame
  currentTime: number
  layers: StudioCanvasLayer[]
  onLayerDragGuideChange: (guide: {
    horizontal: boolean
    vertical: boolean
  } | null) => void
  onLayerGeometryChange: (
    layerId: string,
    geometry: StudioCanvasGeometry,
    options?: GeometryUpdateOptions
  ) => void
  onSelectLayer: (layer: StudioCanvasLayer) => void
  onSelectOverlaySegment: (segment: ActiveCompositionSegment) => void
  onSegmentGeometryChange: (
    segmentId: string,
    geometry: StudioCanvasGeometry,
    options?: GeometryUpdateOptions
  ) => void
  selectedItemId: string
  selectedTargetId: string
}) {
  const activeCaptionCue = getActiveCaptionCue(captionCues, currentTime)
  const layerItems: OverlayItem[] = layers
    .filter((layer) => compositionFrame.visibleLayerIds.has(layer.id))
    .filter((layer) => layer.kind === "text" || layer.kind === "captions")
    .filter((layer) => layer.kind !== "captions" || activeCaptionCue)
    .map((layer) => ({
      id: layer.id,
      geometry: getLayerCanvasGeometry(layer),
      isSelected: selectedTargetId === layer.id,
      kind: "layer" as const,
      label: layer.label,
      layer,
      tone: layer.kind === "captions" ? ("caption" as const) : ("text" as const),
    }))
  const overlayItems: OverlayItem[] = compositionFrame.overlays.flatMap(
    (overlay) => {
      if (!overlay.media || overlay.media.type === "AUDIO") {
        return []
      }

      return [
        {
          id: overlay.segment.id,
          geometry: getOverlaySegmentCanvasGeometry(overlay.segment),
          isSelected: selectedItemId === overlay.segment.id,
          kind: "segment" as const,
          label: overlay.media.name,
          segment: overlay.segment,
          tone: "overlay" as const,
        },
      ]
    }
  )

  return [...overlayItems, ...layerItems].map((item) => (
    <EditorOverlayLayer
      key={`${item.kind}-${item.id}`}
      item={item}
      onDragGuideChange={onLayerDragGuideChange}
      onGeometryChange={(geometry, options) => {
        if (item.kind === "layer") {
          onLayerGeometryChange(item.layer.id, geometry, options)
        } else {
          onSegmentGeometryChange(item.segment.id, geometry, options)
        }
      }}
      onSelect={() => {
        if (item.kind === "layer") {
          onSelectLayer(item.layer)
        } else {
          const overlay = compositionFrame.overlays.find(
            (overlay) => overlay.segment.id === item.segment.id
          )

          if (overlay) {
            onSelectOverlaySegment(overlay)
          }
        }
      }}
    />
  ))
}

function EditorOverlayLayer({
  item,
  onDragGuideChange,
  onGeometryChange,
  onSelect,
}: {
  item: OverlayItem
  onDragGuideChange: (guide: {
    horizontal: boolean
    vertical: boolean
  } | null) => void
  onGeometryChange: (
    geometry: StudioCanvasGeometry,
    options?: GeometryUpdateOptions
  ) => void
  onSelect: () => void
}) {
  const didDragRef = useRef(false)

  const startGesture = (
    event: ReactPointerEvent<HTMLElement>,
    mode:
      | { kind: "move" }
      | {
          handle: "bottom-left" | "bottom-right" | "top-left" | "top-right"
          kind: "resize"
        }
  ) => {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    onSelect()

    const overlayElement = event.currentTarget.closest(
      "[data-studio-canvas-preview]"
    )

    if (!overlayElement) {
      return
    }

    const previewRect = overlayElement.getBoundingClientRect()
    const startClientX = event.clientX
    const startClientY = event.clientY
    const startGeometry = item.geometry
    let hasDragged = false
    let hasRecordedHistory = false

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startClientX
      const deltaY = moveEvent.clientY - startClientY

      if (!hasDragged && Math.hypot(deltaX, deltaY) < 4) {
        return
      }

      moveEvent.preventDefault()
      hasDragged = true
      didDragRef.current = true

      const delta = {
        xPercent: (deltaX / previewRect.width) * 100,
        yPercent: (deltaY / previewRect.height) * 100,
      }
      const unsnappedGeometry =
        mode.kind === "move"
          ? moveCanvasGeometry(startGeometry, delta)
          : resizeCanvasGeometry(startGeometry, mode.handle, delta)
      const shouldSnapVertical =
        mode.kind === "move" &&
        Math.abs(
          (unsnappedGeometry.xPercent / 100) * previewRect.width -
            previewRect.width / 2
        ) <= CANVAS_CENTER_SNAP_THRESHOLD_PX
      const shouldSnapHorizontal =
        mode.kind === "move" &&
        Math.abs(
          (unsnappedGeometry.yPercent / 100) * previewRect.height -
            previewRect.height / 2
        ) <= CANVAS_CENTER_SNAP_THRESHOLD_PX
      const nextGeometry =
        mode.kind === "move"
          ? {
              ...unsnappedGeometry,
              xPercent: shouldSnapVertical ? 50 : unsnappedGeometry.xPercent,
              yPercent: shouldSnapHorizontal ? 50 : unsnappedGeometry.yPercent,
            }
          : unsnappedGeometry

      onDragGuideChange(
        shouldSnapHorizontal || shouldSnapVertical
          ? {
              horizontal: shouldSnapHorizontal,
              vertical: shouldSnapVertical,
            }
          : null
      )
      onGeometryChange(nextGeometry, {
        recordHistory: !hasRecordedHistory,
      })
      hasRecordedHistory = true
    }

    const cleanup = () => {
      onDragGuideChange(null)
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

  const handleClassName =
    "absolute size-3 rounded-full border border-sky-100 bg-sky-400 shadow-[0_0_0_2px_rgba(2,6,23,0.55)]"

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select ${item.label}`}
      onClick={(event) => {
        event.stopPropagation()

        if (didDragRef.current) {
          didDragRef.current = false
          return
        }

        onSelect()
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelect()
        }
      }}
      onPointerDown={(event) => startGesture(event, { kind: "move" })}
      className={cn(
        "absolute z-40 cursor-move rounded-xl border transition-colors",
        item.isSelected
          ? "border-sky-300 bg-sky-400/10 shadow-[0_0_0_1px_rgba(125,211,252,0.25),0_16px_50px_-30px_rgba(14,165,233,0.75)]"
          : "border-white/20 bg-white/[0.035] hover:border-sky-200/80 hover:bg-sky-300/10",
        item.tone === "caption" ? "rounded-[28px]" : null
      )}
      style={{
        left: `${item.geometry.xPercent}%`,
        top: `${item.geometry.yPercent}%`,
        width: `${item.geometry.widthPercent}%`,
        height: `${item.geometry.heightPercent}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {item.isSelected ? (
        <>
          <span
            aria-hidden="true"
            className={`-left-1.5 -top-1.5 cursor-nwse-resize ${handleClassName}`}
            onPointerDown={(event) =>
              startGesture(event, { kind: "resize", handle: "top-left" })
            }
          />
          <span
            aria-hidden="true"
            className={`-right-1.5 -top-1.5 cursor-nesw-resize ${handleClassName}`}
            onPointerDown={(event) =>
              startGesture(event, { kind: "resize", handle: "top-right" })
            }
          />
          <span
            aria-hidden="true"
            className={`-bottom-1.5 -left-1.5 cursor-nesw-resize ${handleClassName}`}
            onPointerDown={(event) =>
              startGesture(event, { kind: "resize", handle: "bottom-left" })
            }
          />
          <span
            aria-hidden="true"
            className={`-bottom-1.5 -right-1.5 cursor-nwse-resize ${handleClassName}`}
            onPointerDown={(event) =>
              startGesture(event, { kind: "resize", handle: "bottom-right" })
            }
          />
        </>
      ) : null}
    </div>
  )
}
