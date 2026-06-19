import { config } from '../../config'
import { MediaStatus, type Media } from '../../infrastructure/db/generated/prisma/client'
import * as storageService from '../../infrastructure/s3/uploader'
import { MediaError } from './media.error'
import * as mediaRepo from './media.repository'
import type { ListMediaQuery, UpdateMediaBody } from './media.schema'
import type {
  AbortUploadResult,
  CompleteUploadInput,
  CompleteUploadResult,
  CompletedUploadPart,
  CreateDownloadUrlResult,
  CreateMediaUploadInput,
  CreateUploadUrlResult,
  PaginatedResult
} from './media.types'
import {
  createUploadObjectKey,
  ensureSupportedFileSize,
  getMultipartPartCount,
  getUploadMode,
  getValidCompletedParts
} from './media.util'

export const listMedia = async (userId: string, query: ListMediaQuery): Promise<PaginatedResult<Media>> => {
  const page: number = query.page
  const limit: number = query.limit
  const skip: number = (page - 1) * limit

  const [items, total] = await mediaRepo.findMediaByUserId(
    userId,
    skip,
    limit,
    query.status,
    query.sortBy,
    query.sortOrder
  )

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
}

const getUploaderOwnedMedia = async (userId: string, mediaId: string): Promise<Media> => {
  const media = await mediaRepo.findMediaById(mediaId)

  if (!media) {
    throw MediaError.notFound()
  }

  if (media.userId !== userId) {
    throw MediaError.forbidden()
  }

  return media
}

const getWorkspaceAccessibleMedia = async (userId: string, mediaId: string): Promise<Media> => {
  const media = await mediaRepo.findWorkspaceAccessibleMediaById(mediaId, userId)

  if (!media || media.status === MediaStatus.DELETED) {
    throw MediaError.notFound()
  }

  return media
}

export const getMedia = async (userId: string, mediaId: string): Promise<Media> =>
  getWorkspaceAccessibleMedia(userId, mediaId)

export const updateMedia = async (userId: string, mediaId: string, data: UpdateMediaBody): Promise<Media> => {
  const media = await getUploaderOwnedMedia(userId, mediaId)

  if (media.status === MediaStatus.DELETED) {
    throw MediaError.notFound()
  }

  return mediaRepo.updateMedia(media.id, data)
}

export const deleteMedia = async (userId: string, mediaId: string): Promise<void> => {
  const media = await getUploaderOwnedMedia(userId, mediaId)

  if (media.status === MediaStatus.DELETED) {
    return
  }

  if (media.status === MediaStatus.UPLOADING) {
    await abortUpload(userId, mediaId)
    return
  }

  await storageService.deleteObject(media.s3Bucket, media.s3Key)
  await mediaRepo.updateMedia(media.id, {
    uploadId: null,
    status: MediaStatus.DELETED
  })
}

export const createDownloadUrl = async (userId: string, mediaId: string): Promise<CreateDownloadUrlResult> => {
  const media = await getWorkspaceAccessibleMedia(userId, mediaId)

  if (media.status !== MediaStatus.UPLOADED) {
    throw MediaError.invalidState(`Cannot create download URL for media in status ${media.status}`)
  }

  const url: string = await storageService.createPresignedDownloadUrl(
    media.s3Bucket,
    media.s3Key,
    media.title ?? media.originalFilename
  )

  return {
    url,
    expiresInSeconds: storageService.PRESIGNED_DOWNLOAD_EXPIRES_SECONDS
  }
}

export const createPreviewUrl = async (userId: string, mediaId: string): Promise<CreateDownloadUrlResult> => {
  const media = await getWorkspaceAccessibleMedia(userId, mediaId)

  if (media.status !== MediaStatus.UPLOADED) {
    throw MediaError.invalidState(`Cannot create preview URL for media in status ${media.status}`)
  }

  const url: string = await storageService.createPresignedPreviewUrl(media.s3Bucket, media.s3Key)

  return {
    url,
    expiresInSeconds: storageService.PRESIGNED_DOWNLOAD_EXPIRES_SECONDS
  }
}

export const createUploadUrl = async (input: CreateMediaUploadInput): Promise<CreateUploadUrlResult> => {
  ensureSupportedFileSize(input.fileSizeBytes)

  const membership = await mediaRepo.findWorkspaceMembership(input.workspaceId, input.userId)

  if (!membership) {
    throw MediaError.forbidden('User is not a member of the requested workspace')
  }

  const bucket: string = config.s3.bucket
  const key: string = createUploadObjectKey(input.workspaceId, input.userId, input.mediaType, input.originalFilename)
  const mode = getUploadMode(input.fileSizeBytes)
  const media = await mediaRepo.createMedia({
    userId: input.userId,
    workspaceId: input.workspaceId,
    title: input.title,
    description: input.description,
    originalFilename: input.originalFilename,
    s3Bucket: bucket,
    s3Key: key,
    s3Region: config.s3.region,
    fileSizeBytes: BigInt(input.fileSizeBytes),
    mimeType: input.mimeType,
    type: input.mediaType,
    status: MediaStatus.UPLOADING
  })

  if (mode === 'SINGLE') {
    try {
      const url = await storageService.createPresignedPutUrl(bucket, key, input.mimeType)

      return {
        mode,
        mediaId: media.id,
        url,
        headers: {
          'Content-Type': input.mimeType
        },
        expiresInSeconds: storageService.PRESIGNED_UPLOAD_EXPIRES_SECONDS
      }
    } catch (error: unknown) {
      await markUploadCreationFailed(media)
      throw error
    }
  }

  let multipartUploadId: string | null = null

  try {
    multipartUploadId = await storageService.createMultipartUpload(bucket, key, input.mimeType)
    const activeMultipartUploadId = multipartUploadId
    const uploadIdSaved = await mediaRepo.updateUploadingMedia(media.id, input.userId, {
      uploadId: activeMultipartUploadId
    })

    if (!uploadIdSaved) {
      throw MediaError.invalidState('Media upload is no longer active')
    }

    const partCount = getMultipartPartCount(input.fileSizeBytes)
    const parts = await storageService.createPresignedUploadPartUrls(bucket, key, activeMultipartUploadId, partCount)

    return {
      mode,
      mediaId: media.id,
      partSizeBytes: config.upload.multipartPartSizeBytes,
      parts,
      expiresInSeconds: storageService.PRESIGNED_UPLOAD_EXPIRES_SECONDS
    }
  } catch (error: unknown) {
    let cleanupSucceeded = true

    if (multipartUploadId) {
      const activeMultipartUploadId = multipartUploadId
      cleanupSucceeded = await tryCleanup(() =>
        storageService.abortMultipartUpload(bucket, key, activeMultipartUploadId)
      )
    }

    await markUploadCreationFailed(media, cleanupSucceeded ? null : multipartUploadId)
    throw error
  }
}

export const completeUpload = async (input: CompleteUploadInput): Promise<CompleteUploadResult> => {
  const media = await getUploaderOwnedMedia(input.userId, input.mediaId)

  if (media.status === MediaStatus.UPLOADED) {
    return { media }
  }

  if (media.status !== MediaStatus.UPLOADING) {
    throw MediaError.invalidState(`Cannot complete upload for media in status ${media.status}`)
  }

  let objectMetadata: Awaited<ReturnType<typeof storageService.headObject>> | undefined

  if (media.uploadId) {
    const fileSizeBytes = Number(media.fileSizeBytes)
    const completedParts: readonly CompletedUploadPart[] = getValidCompletedParts(fileSizeBytes, input.parts)

    try {
      await storageService.completeMultipartUpload(media.s3Bucket, media.s3Key, media.uploadId, completedParts)
    } catch (error: unknown) {
      if (!isMultipartUploadNotFound(error)) {
        throw error
      }

      try {
        objectMetadata = await storageService.headObject(media.s3Bucket, media.s3Key)
      } catch {
        throw error
      }
    }
  } else if (input.parts && input.parts.length > 0) {
    throw MediaError.invalidUpload('Parts should not be provided for single uploads')
  }

  objectMetadata ??= await storageService.headObject(media.s3Bucket, media.s3Key)

  if (objectMetadata.contentLength !== undefined && objectMetadata.contentLength !== Number(media.fileSizeBytes)) {
    await rejectInvalidUploadedObject(media, 'Uploaded object size does not match fileSizeBytes')
  }

  if (objectMetadata.contentType && objectMetadata.contentType.toLowerCase() !== media.mimeType?.toLowerCase()) {
    await rejectInvalidUploadedObject(media, 'Uploaded object content type does not match mimeType')
  }

  const completedMedia = await mediaRepo.updateUploadingMedia(media.id, input.userId, {
    s3Etag: objectMetadata.etag,
    uploadId: null,
    title: media.title ?? media.originalFilename,
    status: MediaStatus.UPLOADED
  })

  if (completedMedia) {
    return { media: completedMedia }
  }

  const currentMedia = await mediaRepo.findMediaById(media.id)

  if (currentMedia?.status === MediaStatus.UPLOADED) {
    return { media: currentMedia }
  }

  if (currentMedia?.status === MediaStatus.DELETED) {
    await storageService.deleteObject(media.s3Bucket, media.s3Key)
    throw MediaError.invalidState('Media upload was aborted before completion')
  }

  throw MediaError.invalidState('Media upload state changed before completion')
}

export const abortUpload = async (userId: string, mediaId: string): Promise<AbortUploadResult> => {
  let media = await getUploaderOwnedMedia(userId, mediaId)

  if (media.status === MediaStatus.UPLOADED) {
    throw MediaError.invalidState('Completed media cannot be aborted')
  }

  if (media.status !== MediaStatus.UPLOADING && media.status !== MediaStatus.DELETED) {
    throw MediaError.invalidState(`Cannot abort upload for media in status ${media.status}`)
  }

  if (media.status === MediaStatus.UPLOADING) {
    const claimedMedia = await mediaRepo.updateUploadingMedia(media.id, userId, {
      status: MediaStatus.DELETED
    })

    if (claimedMedia) {
      media = claimedMedia
    } else {
      media = (await mediaRepo.findMediaById(media.id)) ?? media
    }

    if (!claimedMedia && media.status !== MediaStatus.DELETED) {
      throw MediaError.invalidState(`Cannot abort upload for media in status ${media.status}`)
    }
  }

  await cleanupAbortedUpload(media)

  return {
    message: 'Media upload aborted successfully'
  }
}

const cleanupAbortedUpload = async (media: Media): Promise<void> => {
  if (media.uploadId) {
    await storageService.abortMultipartUpload(media.s3Bucket, media.s3Key, media.uploadId)
  }

  await storageService.deleteObject(media.s3Bucket, media.s3Key)

  if (media.uploadId) {
    await mediaRepo.updateMedia(media.id, {
      uploadId: null
    })
  }
}

const markUploadCreationFailed = async (media: Media, uploadId: string | null = null): Promise<void> => {
  await mediaRepo.updateUploadingMedia(media.id, media.userId, {
    uploadId,
    status: MediaStatus.DELETED
  })
}

const rejectInvalidUploadedObject = async (media: Media, message: string): Promise<never> => {
  let cleanupError: unknown

  try {
    await storageService.deleteObject(media.s3Bucket, media.s3Key)
  } catch (error: unknown) {
    cleanupError = error
  }

  await mediaRepo.updateUploadingMedia(media.id, media.userId, {
    uploadId: null,
    status: 'FAILED'
  })

  if (cleanupError) {
    throw cleanupError
  }

  throw MediaError.invalidUpload(message)
}

const isMultipartUploadNotFound = (error: unknown): boolean =>
  error instanceof MediaError && error.code === 'MULTIPART_UPLOAD_NOT_FOUND'

const tryCleanup = async (cleanup: () => Promise<void>): Promise<boolean> => {
  try {
    await cleanup()
    return true
  } catch {
    return false
  }
}
