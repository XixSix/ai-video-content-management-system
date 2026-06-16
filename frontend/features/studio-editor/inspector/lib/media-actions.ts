import type { StudioProjectMediaItem } from "@/features/studio-editor/studio.types"

export function getMediaActions(media: StudioProjectMediaItem) {
  if (media.type === "VIDEO") {
    return ["Open in timeline", "Replace source", "Set fit mode"]
  }

  if (media.type === "AUDIO") {
    return ["Open in timeline", "Adjust volume", "Enable ducking"]
  }

  if (media.type === "IMAGE") {
    return media.linkedSelectionId
      ? ["Select canvas layer", "Adjust opacity", "Move layer order"]
      : ["Add to canvas", "Crop image", "Use as thumbnail"]
  }

  return ["Apply to Captions", "Burn into video", "Check sync"]
}
