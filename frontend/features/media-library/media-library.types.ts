export type MediaFileStatus = "UPLOADING" | "UPLOADED" | "FAILED" | "DELETED"

export type MediaLibraryViewMode = "grid" | "list"

export type MediaLibrarySortKey = "newest" | "oldest" | "name" | "duration"

export type MediaLibraryTab =
  | "ALL"
  | "ORIGINAL"
  | "EDITOR_OUTPUTS"
  | "LONG_TO_SHORT"

export type MediaLibraryGroup = "ORIGINAL" | "EDITOR_OUTPUT"

export type MediaAssetType = "VIDEO" | "AUDIO" | "IMAGE" | "TRANSCRIPT"

export type MediaTypeFilter = "ALL" | MediaAssetType

export type MediaStatusFilter = "ALL" | "UPLOADING" | "UPLOADED" | "FAILED"

export type MediaLibraryItem = {
  id: string
  title: string
  originalFilename: string
  thumbnailUrl: string | null
  duration: number | null
  fileSizeBytes: number
  mimeType: string
  type: MediaAssetType
  libraryGroup: MediaLibraryGroup
  status: MediaFileStatus
  width: number | null
  height: number | null
  createdAt: string
  updatedAt: string
  hasTranscript: boolean
  hasChapters: boolean
  hasClips: boolean
  hasSubtitles: boolean
  activeJobCount: number
  longToShortSourceId?: string
  uploadProgress?: number
}

export type FilterChipOption<TValue extends string> = {
  label: string
  value: TValue
}

export type SortOption = FilterChipOption<MediaLibrarySortKey>
