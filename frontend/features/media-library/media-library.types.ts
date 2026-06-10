export type MediaFileStatus = "UPLOADING" | "UPLOADED" | "FAILED" | "DELETED"

export type MediaLibraryViewMode = "grid" | "list"

export type MediaLibrarySortKey = "newest" | "oldest" | "name" | "duration"

export type MediaTypeFilter = "ALL" | "VIDEO" | "AUDIO"

export type MediaStatusFilter = "ALL" | "UPLOADING" | "UPLOADED" | "FAILED"

export type MediaLibraryItem = {
  id: string
  title: string
  originalFilename: string
  thumbnailUrl: string | null
  duration: number | null
  fileSizeBytes: number
  mimeType: string
  type: "VIDEO" | "AUDIO"
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
  uploadProgress?: number
}

export type FilterChipOption<TValue extends string> = {
  label: string
  value: TValue
}

export type SortOption = FilterChipOption<MediaLibrarySortKey>
