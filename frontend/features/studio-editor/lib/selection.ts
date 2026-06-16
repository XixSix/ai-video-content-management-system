import type {
  StudioEditorProject,
  StudioSelection,
} from "../studio.types"

export function getStudioSelectionById(
  project: StudioEditorProject,
  selectionId: string
): StudioSelection {
  const mediaItem = project.projectMedia.find((item) => item.id === selectionId)

  if (mediaItem) {
    return {
      id: mediaItem.id,
      kind: "media",
      label: mediaItem.name,
      summary: mediaItem.summary,
      detail: mediaItem.usageLabel,
      media: mediaItem,
      linkedSelectionId: mediaItem.linkedSelectionId,
    }
  }

  if (selectionId === project.sourceMedia.id) {
    return {
      id: project.sourceMedia.id,
      kind: "source",
      label: project.sourceMedia.name,
      summary: project.sourceMedia.summary,
    }
  }

  const layer = project.layers.find((item) => item.id === selectionId)

  if (layer) {
    return {
      id: layer.id,
      kind: "layer",
      label: layer.label,
      summary: layer.summary,
      detail:
        layer.kind === "text"
          ? "Canvas layer"
          : layer.kind === "captions"
            ? "Caption layer"
            : "Image layer",
      layer,
    }
  }

  for (const track of project.timelineTracks) {
    const segment = track.segments.find((item) => item.id === selectionId)

    if (segment) {
      return {
        id: segment.id,
        kind: "segment",
        label: segment.label,
        summary: segment.summary,
        detail: "Timeline segment",
        linkedSelectionId: segment.selectionId,
        trackLabel: track.label,
      }
    }
  }

  return {
    id: project.sourceMedia.id,
    kind: "source",
    label: project.sourceMedia.name,
    summary: project.sourceMedia.summary,
  }
}
