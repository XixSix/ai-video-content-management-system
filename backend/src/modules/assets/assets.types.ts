import type { AssetType, GeneratedAsset } from '../../infrastructure/db/generated/prisma/client'

export interface AssetResponseData {
  id: string
  transcriptId: string | null
  chapterId: string | null
  assetType: AssetType
  transcriptVersion: number | null
  mimeType: string | null
  fileSizeBytes: string | null
  metadata: unknown
  createdAt: Date
}

export interface CreateAssetDownloadUrlResult {
  url: string
  expiresInSeconds: number
}

export interface PaginatedResult<TItem> {
  items: TItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type AssetSortField = 'createdAt' | 'assetType'
export type SortOrder = 'asc' | 'desc'

export type GeneratedAssetRecord = GeneratedAsset
