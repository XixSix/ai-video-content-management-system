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
  visibleLayerIds,
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
  visibleLayerIds: Set<string>
}) {
  return layers
    .filter((layer) => visibleLayerIds.has(layer.id))
    .sort((left, right) => {
      if (left.kind === "captions") return 1
      if (right.kind === "captions") return -1
      return 0
    })
    .map((layer) => (
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
