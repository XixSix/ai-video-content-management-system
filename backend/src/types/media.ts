import type { Media } from '../infrastructure/db/generated/prisma/client'
import type { AbortMultipartUploadBody, CompleteUploadBody, CreateUploadUrlBody } from '../modules/media/media.schema'

export type UploadMediaType = 'VIDEO' | 'IMAGE'

export type UploadMode = 'SINGLE' | 'MULTIPART'

export type CreateMediaUploadInput = CreateUploadUrlBody & { userId: string }

export interface PresignedUploadPart {
  partNumber: number
  url: string
}

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

export interface CompletedUploadPart {
  partNumber: number
  etag: string
}

export type CompleteUploadInput = CompleteUploadBody & { userId: string }

export type AbortMultipartUploadInput = AbortMultipartUploadBody & { userId: string }

export interface UploadedMediaResponse {
  id: string
  s3Bucket: string
  s3Key: string
  status: string
}

export interface CompleteUploadResult {
  media: Media
}

export interface CompleteUploadResponseData {
  media: UploadedMediaResponse
}

export interface AbortMultipartUploadResult {
  message: string
}

export interface StorageObjectMetadata {
  contentLength?: number
  contentType?: string
  etag?: string
}
