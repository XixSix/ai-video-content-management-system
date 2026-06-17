import type {
  StudioCanvasLayer,
  StudioCaptionCue,
} from "../../studio.types"
import { getActiveCaptionCue } from "../lib/caption-activity"
import { CanvasLayer } from "./canvas-layer"

export function CanvasLayerList({
  captionCues,
  currentTime,
  layers,
  onLayerDragGuideChange,
  onMoveLayer,
  onSelectLayer,
  selectedTargetId,
}: {
  captionCues: StudioCaptionCue[]
  currentTime: number
  layers: StudioCanvasLayer[]
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
  onSelectLayer: (layer: StudioCanvasLayer) => void
  selectedTargetId: string
}) {
  return layers.map((layer) => (
    <CanvasLayer
      key={layer.id}
      activeCue={
        layer.kind === "captions"
          ? getActiveCaptionCue(captionCues, currentTime)
          : null
      }
      currentTime={currentTime}
      isSelected={selectedTargetId === layer.id}
      layer={layer}
      onLayerDragGuideChange={onLayerDragGuideChange}
      onMoveLayer={onMoveLayer}
      onSelect={onSelectLayer}
    />
  ))
}
