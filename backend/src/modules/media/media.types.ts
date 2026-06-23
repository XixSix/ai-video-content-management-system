import type { Media, Prisma } from '../../infrastructure/db/generated/prisma/client'
import type { CompletedUploadPart, PresignedUploadPart } from '../../infrastructure/s3/s3.types'
import type { CompleteUploadBody, CreateUploadUrlBody } from './media.schema'

export type UploadMediaType = 'VIDEO' | 'AUDIO' | 'IMAGE' | 'SUBTITLE'

export type UploadMode = 'SINGLE' | 'MULTIPART'

export type CreateMediaUploadInput = CreateUploadUrlBody & { userId: string; workspaceId: string }

export interface SinglePresignResult {
  mode: 'SINGLE'
  mediaId: string
  url: string
  headers: Record<string, string>
  expiresInSeconds: number
}

export interface MultipartPresignResult {
  mode: 'MULTIPART'
  mediaId: string
  partSizeBytes: number
  parts: PresignedUploadPart[]
  expiresInSeconds: number
}

export type CreateUploadUrlResult = SinglePresignResult | MultipartPresignResult

export type CompleteUploadInput = CompleteUploadBody & { userId: string; workspaceId: string; mediaId: string }

export interface MediaResponseData {
  id: string
  workspaceId: string
  type: UploadMediaType
  title: string | null
  description: string | null
  originalFilename: string
  duration: number | null
  fileSizeBytes: string | null
  mimeType: string | null
  width: number | null
  height: number | null
  metadata: Prisma.JsonValue | null
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface MediaPreviewAssetResponseData {
  id: string
  url: string
  assetType: 'THUMBNAIL' | 'THUMBNAIL_SPRITE' | 'WAVEFORM_PEAKS'
  mimeType: string | null
  fileSizeBytes: string | null
  metadata: Prisma.JsonValue | null
  expiresInSeconds: number
}

export interface MediaListItemResponseData extends MediaResponseData {
  thumbnail: MediaPreviewAssetResponseData | null
}

export interface MediaPreviewAssetsResponseData {
  thumbnail: MediaPreviewAssetResponseData | null
  thumbnailSprite: MediaPreviewAssetResponseData | null
  waveformPeaks: MediaPreviewAssetResponseData | null
}

export interface MediaDetailResponseData extends MediaResponseData {
  previews: MediaPreviewAssetsResponseData
}

export interface CompleteUploadResult {
  media: Media
}

export interface CompleteUploadResponseData {
  media: MediaResponseData
}

export interface CreateDownloadUrlResult {
  url: string
  expiresInSeconds: number
}

export interface AbortUploadResult {
  message: string
}

export interface PaginatedResult<TItem> {
  items: TItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type { CompletedUploadPart }
