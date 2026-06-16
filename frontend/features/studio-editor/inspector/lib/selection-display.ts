import type { StudioSelection } from "@/features/studio-editor/studio.types"

export function getSelectionBadge(selectionKind: StudioSelection["kind"]) {
  if (selectionKind === "media") {
    return "Media"
  }

  if (selectionKind === "source") {
    return "Source"
  }

  if (selectionKind === "segment") {
    return "Timeline"
  }

  return "Canvas"
}
