export type GeneratedAssetType =
  | "THUMBNAIL"
  | "THUMBNAIL_SPRITE"
  | "SUBTITLE_SRT"
  | "SUBTITLE_VTT"
  | "BURNED_SUBTITLE_VIDEO"
  | "EXPORT_VIDEO"
  | "EXPORT_AUDIO"
  | "WAVEFORM_PEAKS"

export type GeneratedAssetData = {
  id: string
  mediaId: string | null
  projectId: string | null
  transcriptId: string | null
  chapterId: string | null
  assetType: GeneratedAssetType
  transcriptVersion: number | null
  mimeType: string | null
  fileSizeBytes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export type GeneratedAssetListQuery = {
  page?: number
  limit?: number
  assetType?: GeneratedAssetType
  mediaId?: string
  projectId?: string
  transcriptId?: string
  chapterId?: string
  sortBy?: "createdAt" | "assetType"
  sortOrder?: "asc" | "desc"
}

export type GeneratedAssetListResponse = {
  items: GeneratedAssetData[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
