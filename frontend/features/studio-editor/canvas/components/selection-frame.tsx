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
    .filter((layer) => layer.kind !== "text")
    .map((layer) => {
      const handleClassName =
        layer.kind === "captions"
          ? "size-3 rounded-full border border-emerald-100 bg-emerald-400 shadow-[0_0_0_2px_rgba(16,185,129,0.18)]"
          : "size-3 rounded-full border border-sky-200 bg-sky-400"

      return (
        <div key={`${layer.id}-frame`} className={layer.frameClassName}>
          <div className={`absolute -left-1.5 -top-1.5 ${handleClassName}`} />
          <div className={`absolute -right-1.5 -top-1.5 ${handleClassName}`} />
          <div className={`absolute -left-1.5 -bottom-1.5 ${handleClassName}`} />
          <div className={`absolute -right-1.5 -bottom-1.5 ${handleClassName}`} />
          {layer.kind === "captions" ? (
            <>
              <div className={`absolute left-1/2 -top-1.5 -translate-x-1/2 ${handleClassName}`} />
              <div className={`absolute left-1/2 -bottom-1.5 -translate-x-1/2 ${handleClassName}`} />
            </>
          ) : null}
        </div>
      )
    })
}
