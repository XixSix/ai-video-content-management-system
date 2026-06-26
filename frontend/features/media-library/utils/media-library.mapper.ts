import type {
  MediaListItemResponseData,
  MediaLibraryItem,
} from "../types/media-library.types";
import { getMediaListThumbnailUrl } from "../lib/media-previews";

export function mapMediaResponseToLibraryItem(
  media: MediaListItemResponseData,
): MediaLibraryItem {
  return {
    id: media.id,
    title: media.title ?? media.originalFilename,
    originalFilename: media.originalFilename,
    assetUrl: null,
    thumbnailUrl: getMediaListThumbnailUrl(media),
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
  };
}
