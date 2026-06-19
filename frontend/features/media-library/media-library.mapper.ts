import type {
  MediaLibraryItem,
  MediaResponseData,
} from "./media-library.types"

export function mapMediaResponseToLibraryItem(
  media: MediaResponseData
): MediaLibraryItem {
  return {
    id: media.id,
    title: media.title ?? media.originalFilename,
    originalFilename: media.originalFilename,
    assetUrl: null,
    thumbnailUrl: null,
    duration: media.duration,
    fileSizeBytes: Number(media.fileSizeBytes ?? 0),
    mimeType: media.mimeType ?? "application/octet-stream",
    type: media.type === "SUBTITLE" ? "TRANSCRIPT" : media.type,
    libraryGroup: "ORIGINAL",
    status: media.status,
    width: media.width,
    height: media.height,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
    hasTranscript: false,
    hasChapters: false,
    hasClips: false,
    hasSubtitles: media.type === "SUBTITLE",
    activeJobCount: 0,
    uploadInterrupted: media.status === "UPLOADING",
  }
}
