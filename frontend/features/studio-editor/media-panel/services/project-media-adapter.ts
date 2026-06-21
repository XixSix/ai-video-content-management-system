import type { MediaLibraryItem } from "@/features/media-library/media-library.types"
import type { ProjectMedia } from "@/features/studio-hub/studio-projects.types"

import { mapProjectMediaToStudioItem } from "../../editor-snapshot/editor-snapshot.mapper"
import type { StudioProjectMediaItem } from "../../studio.types"

export type StudioMediaUploadPurpose = "PROJECT_MEDIA" | "SOURCE"

export function assignStudioUploadPurposes(
  mediaTypes: Array<"VIDEO" | "AUDIO" | "IMAGE" | "SUBTITLE">,
  hasSourceOrPendingSource: boolean
): StudioMediaUploadPurpose[] {
  let sourceAssigned = hasSourceOrPendingSource

  return mediaTypes.map((mediaType) => {
    if (
      !sourceAssigned &&
      (mediaType === "VIDEO" || mediaType === "AUDIO")
    ) {
      sourceAssigned = true
      return "SOURCE"
    }

    return "PROJECT_MEDIA"
  })
}

export function isSupportedProjectMediaUpload(file: File) {
  return (
    file.type.startsWith("video/") ||
    file.type.startsWith("audio/") ||
    file.type.startsWith("image/")
  )
}

export function getImportableMediaLibraryItems(
  projectMedia: StudioProjectMediaItem[],
  libraryItems: MediaLibraryItem[]
) {
  const importedLibraryItemIds = new Set(
    projectMedia.map((item) => item.sourceLibraryItemId ?? item.id)
  )

  return libraryItems.filter(
    (item) =>
      item.type !== "TRANSCRIPT" &&
      !importedLibraryItemIds.has(item.id)
  )
}

export function createProjectMediaFromResponse(
  item: ProjectMedia
): StudioProjectMediaItem {
  return mapProjectMediaToStudioItem(item)
}
