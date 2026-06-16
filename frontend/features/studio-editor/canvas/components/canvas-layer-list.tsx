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
  onMoveTextLayer,
  onSelectLayer,
  onTextDragGuideChange,
  selectedTargetId,
}: {
  captionCues: StudioCaptionCue[]
  currentTime: number
  layers: StudioCanvasLayer[]
  onMoveTextLayer: (
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
  onTextDragGuideChange: (guide: {
    horizontal: boolean
    vertical: boolean
  } | null) => void
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
      onMoveTextLayer={onMoveTextLayer}
      onSelect={onSelectLayer}
      onTextDragGuideChange={onTextDragGuideChange}
    />
  ))
}
