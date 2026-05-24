import type { Media } from '../../infrastructure/db/generated/prisma/client'
import type { CompletedUploadPart, PresignedUploadPart } from '../../infrastructure/s3/s3.types'
import type { AbortMultipartUploadBody, CompleteUploadBody, CreateUploadUrlBody } from './media.schema'

export type UploadMediaType = 'VIDEO' | 'IMAGE'

export type UploadMode = 'SINGLE' | 'MULTIPART'

export type CreateMediaUploadInput = CreateUploadUrlBody & { userId: string }

export interface SinglePresignResult {
  mode: 'SINGLE'
  mediaId: string
  bucket: string
  key: string
  url: string
  headers: Record<string, string>
  expiresInSeconds: number
}

export interface MultipartPresignResult {
  mode: 'MULTIPART'
  mediaId: string
  bucket: string
  key: string
  multipartUploadId: string
  partSizeBytes: number
  parts: PresignedUploadPart[]
  expiresInSeconds: number
}

export type CreateUploadUrlResult = SinglePresignResult | MultipartPresignResult

export type CompleteUploadInput = CompleteUploadBody & { userId: string }

export type AbortMultipartUploadInput = AbortMultipartUploadBody & { userId: string }

export interface UploadedMediaResponse {
  id: string
  title: string | null
  description: string | null
  originalFilename: string
  s3Bucket: string
  s3Key: string
  duration: number | null
  fileSizeBytes: string | null
  mimeType: string | null
  width: number | null
  height: number | null
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface MediaResponseData {
  id: string
  title: string | null
  description: string | null
  originalFilename: string
  duration: number | null
  fileSizeBytes: string | null
  mimeType: string | null
  width: number | null
  height: number | null
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface CompleteUploadResult {
  media: Media
}

export interface CompleteUploadResponseData {
  media: UploadedMediaResponse
}

export interface CreateDownloadUrlResult {
  url: string
  expiresInSeconds: number
}

export interface AbortMultipartUploadResult {
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
