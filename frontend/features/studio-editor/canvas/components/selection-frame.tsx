import type {
  StudioCanvasLayer,
  StudioSelection,
} from "../../studio.types"

export function CanvasSelectionFrame({
  layers,
  selectedItem,
  selectedTargetId,
}: {
  layers: StudioCanvasLayer[]
  selectedItem: StudioSelection
  selectedTargetId: string
}) {
  if (selectedItem.kind === "source") {
    return null
  }

  return layers
    .filter((layer) => layer.id === selectedTargetId)
    .map((layer) => (
      <div key={`${layer.id}-frame`} className={layer.frameClassName}>
        <div className="absolute -left-1.5 -top-1.5 size-3 rounded-full border border-sky-200 bg-sky-400" />
        <div className="absolute -right-1.5 -top-1.5 size-3 rounded-full border border-sky-200 bg-sky-400" />
        <div className="absolute -left-1.5 -bottom-1.5 size-3 rounded-full border border-sky-200 bg-sky-400" />
        <div className="absolute -right-1.5 -bottom-1.5 size-3 rounded-full border border-sky-200 bg-sky-400" />
      </div>
    ))
}
