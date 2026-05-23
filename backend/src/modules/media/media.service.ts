import * as mediaRepo from './media.repository'
import { config } from '../../config'
import { MediaError } from './media.error'
import * as storageService from '../../infrastructure/s3/uploader'
import type {
  AbortMultipartUploadInput,
  AbortMultipartUploadResult,
  CreateMediaUploadInput,
  CreateUploadUrlResult,
  CompleteUploadInput,
  CompleteUploadResult,
  CompletedUploadPart
} from '../../types/media'
import {
  createUploadObjectKey,
  ensureBucketAndUserKey,
  ensureSupportedFileSize,
  getMultipartPartCount,
  getUploadMode,
  getValidCompletedParts
} from '../../utils/media.util'

export const createUploadUrl = async (input: CreateMediaUploadInput): Promise<CreateUploadUrlResult> => {
  ensureSupportedFileSize(input.fileSizeBytes)

  const bucket: string = config.s3.bucket
  const key: string = createUploadObjectKey(input.userId, input.mediaType, input.originalFilename)
  const mode: 'SINGLE' | 'MULTIPART' = getUploadMode(input.fileSizeBytes)

  let mediaId: string

  if (mode === 'SINGLE') {
    const url: string = await storageService.createPresignedPutUrl(bucket, key, input.mimeType)

    const media = await mediaRepo.createMedia({
      userId: input.userId,
      title: input.title,
      description: input.description,
      originalFilename: input.originalFilename,
      s3Bucket: bucket,
      s3Key: key,
      s3Region: config.s3.region,
      fileSizeBytes: BigInt(input.fileSizeBytes),
      mimeType: input.mimeType,
      type: input.mediaType,
      status: 'UPLOADING'
    })
    mediaId = media.id

    return {
      mode,
      mediaId,
      bucket,
      key,
      url,
      headers: {
        'Content-Type': input.mimeType
      },
      expiresInSeconds: storageService.PRESIGNED_UPLOAD_EXPIRES_SECONDS
    }
  }

  const partCount: number = getMultipartPartCount(input.fileSizeBytes)
  const multipartUploadId: string = await storageService.createMultipartUpload(bucket, key, input.mimeType)
  const parts = await storageService.createPresignedUploadPartUrls(bucket, key, multipartUploadId, partCount)

  const media = await mediaRepo.createMedia({
    userId: input.userId,
    title: input.title,
    description: input.description,
    originalFilename: input.originalFilename,
    s3Bucket: bucket,
    s3Key: key,
    s3Region: config.s3.region,
    uploadId: multipartUploadId,
    fileSizeBytes: BigInt(input.fileSizeBytes),
    mimeType: input.mimeType,
    type: input.mediaType,
    status: 'UPLOADING'
  })
  mediaId = media.id

  return {
    mode,
    mediaId,
    bucket,
    key,
    multipartUploadId,
    partSizeBytes: config.upload.multipartPartSizeBytes,
    parts,
    expiresInSeconds: storageService.PRESIGNED_UPLOAD_EXPIRES_SECONDS
  }
}

export const completeUpload = async (input: CompleteUploadInput): Promise<CompleteUploadResult> => {
  const existingMedia = await mediaRepo.findExistingUploadedMediaById(input.mediaId)

  if (!existingMedia || !existingMedia.media) {
    throw MediaError.invalidUpload('Media not found')
  }

  const media = existingMedia.media

  if (media.userId !== input.userId) {
    throw MediaError.invalidUpload('User does not own this media')
  }

  if (media.status !== 'UPLOADING') {
    if (media.status === 'UPLOADED') {
      return { media }
    }
    throw MediaError.invalidUpload(`Cannot complete upload for media in status ${media.status}`)
  }

  if (media.uploadId) {
    if (!input.parts || input.parts.length === 0) {
      throw MediaError.invalidUpload('Parts are required for multipart uploads')
    }

    const fileSizeBytes = Number(media.fileSizeBytes)
    const completedParts: readonly CompletedUploadPart[] = getValidCompletedParts(fileSizeBytes, input.parts)
    await storageService.completeMultipartUpload(media.s3Bucket, media.s3Key, media.uploadId, completedParts)
  } else {
    if (input.parts && input.parts.length > 0) {
      throw MediaError.invalidUpload('Parts should not be provided for single uploads')
    }
  }

  const objectMetadata = await storageService.headObject(media.s3Bucket, media.s3Key)

  if (objectMetadata.contentLength !== undefined && objectMetadata.contentLength !== Number(media.fileSizeBytes)) {
    throw MediaError.invalidUpload('Uploaded object size does not match fileSizeBytes')
  }

  if (objectMetadata.contentType && objectMetadata.contentType !== media.mimeType) {
    throw MediaError.invalidUpload('Uploaded object content type does not match mimeType')
  }

  const updatedMedia = await mediaRepo.updateMedia(media.id, {
    s3Etag: objectMetadata.etag,
    status: 'UPLOADED'
  })

  return { media: updatedMedia }
}

export const abortMultipartUpload = async (input: AbortMultipartUploadInput): Promise<AbortMultipartUploadResult> => {
  ensureBucketAndUserKey(input.userId, input.bucket, input.key)
  await storageService.abortMultipartUpload(input.bucket, input.key, input.multipartUploadId)

  return {
    message: 'Multipart upload aborted'
  }
}
