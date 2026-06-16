import { mediaLibraryItems } from "@/features/media-library/media-library.data"
import type { MediaLibraryItem } from "@/features/media-library/media-library.types"
import { formatFileSize } from "@/features/media-library/media-library.utils"

import { createStudioMediaItem } from "../../data/media.mock"
import type {
  StudioProjectMediaItem,
  StudioProjectMediaType,
} from "../../studio.types"

function getUploadedMediaType(file: File): StudioProjectMediaType {
  if (file.type.startsWith("video/")) {
    return "VIDEO"
  }

  if (file.type.startsWith("audio/")) {
    return "AUDIO"
  }

  if (file.type.startsWith("image/")) {
    return "IMAGE"
  }

  return "SUBTITLE"
}

export function isSupportedProjectMediaUpload(file: File) {
  return (
    file.type.startsWith("video/") ||
    file.type.startsWith("audio/") ||
    file.type.startsWith("image/")
  )
}

function getFormatLabel(file: File) {
  const subtype = file.type.split("/")[1]
  const extension = file.name.split(".").pop()

  return (subtype ?? extension ?? "FILE").split(";")[0].toUpperCase()
}

export function getImportableMediaLibraryItems(
  projectMedia: StudioProjectMediaItem[]
) {
  const importedLibraryItemIds = new Set(
    projectMedia.map((item) => item.sourceLibraryItemId ?? item.id)
  )

  return mediaLibraryItems.filter(
    (item) => item.type !== "TRANSCRIPT" && !importedLibraryItemIds.has(item.id)
  )
}

export function createProjectMediaFromLibraryItem(
  item: MediaLibraryItem
): StudioProjectMediaItem {
  return createStudioMediaItem(item, {
    summary: "Imported from Media Library for this edit.",
    usageLabel: item.libraryGroup === "ORIGINAL" ? "Project media" : "Generated output",
  })
}

export function createProjectMediaFromUploadFile(
  file: File
): StudioProjectMediaItem {
  const type = getUploadedMediaType(file)
  const objectUrl = URL.createObjectURL(file)
  const sizeLabel = formatFileSize(file.size)

  return {
    id: `upload-${crypto.randomUUID()}`,
    type,
    name: file.name,
    summary: "Local upload added to this editor session.",
    origin: "UPLOAD",
    status: "READY",
    assetUrl: objectUrl,
    thumbnailUrl: type === "IMAGE" ? objectUrl : null,
    format: getFormatLabel(file),
    metadata: sizeLabel,
    usageLabel: "Uploaded media",
    sizeLabel,
  }
}
