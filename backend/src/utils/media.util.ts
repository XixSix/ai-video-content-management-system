import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { config } from '../config'
import type { Media } from '../infrastructure/db/generated/prisma/client'
import { MediaError } from '../modules/media/media.error'
import type { CompletedUploadPart, UploadMediaType, UploadedMediaResponse } from '../types/media'

export const getMultipartPartCount = (fileSizeBytes: number): number => {
  return Math.ceil(fileSizeBytes / config.upload.multipartPartSizeBytes)
}

export const ensureSupportedFileSize = (fileSizeBytes: number): void => {
  const partCount: number = getMultipartPartCount(fileSizeBytes)

  if (partCount > config.upload.maxMultipartParts) {
    throw MediaError.invalidUpload('File is too large for the configured multipart part size')
  }
}

export const getMediaFolder = (mediaType: UploadMediaType): string => {
  return mediaType === 'VIDEO' ? 'videos' : 'images'
}

export const getSafeFileExtension = (originalFilename: string): string => {
  const filename: string = originalFilename.split(/[\\/]/).pop() ?? originalFilename
  const extension: string = path.extname(filename).toLowerCase()

  if (!extension || extension.length > 20 || !/^\.[a-z0-9]+$/.test(extension)) {
    return ''
  }

  return extension
}

export const createUploadObjectKey = (userId: string, mediaType: UploadMediaType, originalFilename: string): string => {
  const uploadSessionId: string = randomUUID()
  const mediaFolder: string = getMediaFolder(mediaType)
  const extension: string = getSafeFileExtension(originalFilename)

  return `uploads/users/${userId}/${mediaFolder}/${uploadSessionId}/original${extension}`
}

export const getUploadMode = (fileSizeBytes: number): 'SINGLE' | 'MULTIPART' => {
  return fileSizeBytes > config.upload.multipartThresholdBytes ? 'MULTIPART' : 'SINGLE'
}

export const ensureExpectedUploadMode = (mode: 'SINGLE' | 'MULTIPART', fileSizeBytes: number): void => {
  const expectedMode: 'SINGLE' | 'MULTIPART' = getUploadMode(fileSizeBytes)

  if (mode !== expectedMode) {
    throw MediaError.invalidUpload(`Upload mode must be ${expectedMode} for this file size`)
  }
}

export const ensureUploadTargetIsAllowed = (
  userId: string,
  mediaType: UploadMediaType,
  bucket: string,
  key: string
): void => {
  ensureBucketAndUserKey(userId, bucket, key)

  const expectedMediaPrefix: string = `uploads/users/${userId}/${getMediaFolder(mediaType)}/`

  if (!key.startsWith(expectedMediaPrefix)) {
    throw MediaError.forbidden()
  }
}

export const ensureBucketAndUserKey = (userId: string, bucket: string, key: string): void => {
  if (bucket !== config.s3.bucket) {
    throw MediaError.invalidUpload('bucket does not match configured upload bucket')
  }

  const expectedUserPrefix: string = `uploads/users/${userId}/`

  if (!key.startsWith(expectedUserPrefix)) {
    throw MediaError.forbidden()
  }
}

export const getValidCompletedParts = (
  fileSizeBytes: number,
  parts?: readonly CompletedUploadPart[]
): readonly CompletedUploadPart[] => {
  if (!parts || parts.length === 0) {
    throw MediaError.invalidUpload('Parts are required for multipart uploads')
  }

  const expectedPartCount: number = getMultipartPartCount(fileSizeBytes)

  if (parts.length !== expectedPartCount) {
    throw MediaError.invalidUpload('Multipart part count does not match fileSizeBytes')
  }

  const partNumbers: Set<number> = new Set(parts.map((part) => part.partNumber))

  if (partNumbers.size !== parts.length) {
    throw MediaError.invalidUpload('Multipart parts contain duplicate part numbers')
  }

  for (let partNumber = 1; partNumber <= expectedPartCount; partNumber += 1) {
    if (!partNumbers.has(partNumber)) {
      throw MediaError.invalidUpload('Multipart parts must include every part number')
    }
  }

  return parts
}

export const toUploadedMediaResponse = (media: Media): UploadedMediaResponse => {
  return {
    id: media.id,
    s3Bucket: media.s3Bucket,
    s3Key: media.s3Key,
    status: media.status
  }
}
