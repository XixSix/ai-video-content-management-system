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
  assetUrl: string | null
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
  ownerName?: string
  uploadProgress?: number
  uploadError?: string
  uploadInterrupted?: boolean
  isDemo?: boolean
}

export type FilterChipOption<TValue extends string> = {
  label: string
  value: TValue
}

export type SortOption = FilterChipOption<MediaLibrarySortKey>

export type MediaApiType = "VIDEO" | "AUDIO" | "IMAGE" | "SUBTITLE"

export type MediaApiStatus = MediaFileStatus

export type MediaResponseData = {
  id: string
  workspaceId: string
  type: MediaApiType
  title: string | null
  description: string | null
  originalFilename: string
  duration: number | null
  fileSizeBytes: string | null
  mimeType: string | null
  width: number | null
  height: number | null
  metadata: Record<string, unknown> | null
  status: MediaApiStatus
  createdAt: string
  updatedAt: string
}

export type MediaListMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
}

export type MediaListResponseData = {
  items: MediaResponseData[]
  meta: MediaListMeta
}

export type MediaListQuery = {
  page?: number
  limit?: number
  status?: Exclude<MediaApiStatus, "DELETED">
  sortBy?: "createdAt" | "title" | "duration"
  sortOrder?: "asc" | "desc"
}

export type CreateUploadUrlInput = {
  workspaceId: string
  mediaType: MediaApiType
  originalFilename: string
  mimeType: string
  fileSizeBytes: number
  title?: string
  description?: string
}

export type SingleUploadSession = {
  mode: "SINGLE"
  mediaId: string
  url: string
  headers: Record<string, string>
  expiresInSeconds: number
}

export type MultipartUploadSession = {
  mode: "MULTIPART"
  mediaId: string
  partSizeBytes: number
  parts: Array<{
    partNumber: number
    url: string
  }>
  expiresInSeconds: number
}

export type CreateUploadUrlResult =
  | SingleUploadSession
  | MultipartUploadSession

export type CompletedUploadPart = {
  partNumber: number
  etag: string
}

export type MediaUploadOptions = {
  file: File
  workspaceId: string
  signal?: AbortSignal
  onProgress?: (progress: number) => void
}
