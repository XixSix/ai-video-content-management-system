import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { config } from '../../config'
import type { Media } from '../../infrastructure/db/generated/prisma/client'
import { MAX_UPLOAD_FILE_SIZE_BYTES } from './media.constants'
import { MediaError } from './media.error'
import type { CompletedUploadPart, MediaResponseData, UploadMediaType } from './media.types'

export const getMultipartPartCount = (fileSizeBytes: number): number =>
  Math.ceil(fileSizeBytes / config.upload.multipartPartSizeBytes)

export const ensureSupportedFileSize = (fileSizeBytes: number): void => {
  if (fileSizeBytes > MAX_UPLOAD_FILE_SIZE_BYTES) {
    throw MediaError.invalidUpload(`File size cannot exceed ${MAX_UPLOAD_FILE_SIZE_BYTES} bytes`)
  }
}

export const getMediaFolder = (mediaType: UploadMediaType): string => {
  const folders: Record<UploadMediaType, string> = {
    VIDEO: 'videos',
    AUDIO: 'audio',
    IMAGE: 'images',
    SUBTITLE: 'subtitles'
  }

  return folders[mediaType]
}

export const getSafeFileExtension = (originalFilename: string): string => {
  const filename: string = originalFilename.split(/[\\/]/).pop() ?? originalFilename
  const extension: string = path.extname(filename).toLowerCase()

  if (!extension || extension.length > 20 || !/^\.[a-z0-9]+$/.test(extension)) {
    return ''
  }

  return extension
}

export const createUploadObjectKey = (
  workspaceId: string,
  userId: string,
  mediaType: UploadMediaType,
  originalFilename: string
): string => {
  const uploadSessionId: string = randomUUID()
  const mediaFolder: string = getMediaFolder(mediaType)
  const extension: string = getSafeFileExtension(originalFilename)

  return `uploads/workspaces/${workspaceId}/users/${userId}/${mediaFolder}/${uploadSessionId}/original${extension}`
}

export const getUploadMode = (fileSizeBytes: number): 'SINGLE' | 'MULTIPART' =>
  fileSizeBytes > config.upload.multipartThresholdBytes ? 'MULTIPART' : 'SINGLE'

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

export const toMediaResponseData = (media: Media): MediaResponseData => ({
  id: media.id,
  workspaceId: media.workspaceId,
  type: media.type as UploadMediaType,
  title: media.title,
  description: media.description,
  originalFilename: media.originalFilename,
  duration: media.duration,
  fileSizeBytes: media.fileSizeBytes ? media.fileSizeBytes.toString() : null,
  mimeType: media.mimeType,
  width: media.width,
  height: media.height,
  metadata: media.metadata,
  status: media.status,
  createdAt: media.createdAt,
  updatedAt: media.updatedAt
})
