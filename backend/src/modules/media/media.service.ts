import { config } from '../../config'
import { MediaStatus, type GeneratedAsset, type Media } from '../../infrastructure/db/generated/prisma/client'
import * as storageService from '../../infrastructure/s3/uploader'
import * as mediaPreviewsService from '../media-previews/media-previews.service'
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
  MediaDetailResponseData,
  MediaListItemResponseData,
  MediaPreviewAssetResponseData,
  MediaPreviewAssetsResponseData,
  PaginatedResult
} from './media.types'
import {
  createUploadObjectKey,
  ensureSupportedFileSize,
  getMultipartPartCount,
  getUploadMode,
  getValidCompletedParts,
  toMediaResponseData
} from './media.util'

export const listMedia = async (
  workspaceId: string,
  query: ListMediaQuery
): Promise<PaginatedResult<MediaListItemResponseData>> => {
  const page: number = query.page
  const limit: number = query.limit
  const skip: number = (page - 1) * limit

  const [items, total] = await mediaRepo.findMediaByWorkspaceId(
    workspaceId,
    skip,
    limit,
    query.status,
    query.sortBy,
    query.sortOrder
  )

  const responseItems = await Promise.all(
    items.map(async (media): Promise<MediaListItemResponseData> => {
      const thumbnailAsset = media.generatedAssets[0]

      return {
        ...toMediaResponseData(media),
        thumbnail: thumbnailAsset
          ? {
              id: thumbnailAsset.id,
              url: await storageService.createPresignedGetUrl(thumbnailAsset.s3Bucket, thumbnailAsset.s3Key),
              assetType: 'THUMBNAIL',
              mimeType: thumbnailAsset.mimeType,
              fileSizeBytes: thumbnailAsset.fileSizeBytes?.toString() ?? null,
              metadata: thumbnailAsset.metadata,
              expiresInSeconds: storageService.PRESIGNED_DOWNLOAD_EXPIRES_SECONDS
            }
          : null
      }
    })
  )

  return {
    items: responseItems,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
}

const getUploaderOwnedMedia = async (workspaceId: string, userId: string, mediaId: string): Promise<Media> => {
  const media = await mediaRepo.findMediaByIdInWorkspace(mediaId, workspaceId)

  if (!media) {
    throw MediaError.notFound()
  }

  if (media.userId !== userId) {
    throw MediaError.forbidden()
  }

  return media
}

const getWorkspaceMedia = async (workspaceId: string, mediaId: string): Promise<Media> => {
  const media = await mediaRepo.findMediaByIdInWorkspace(mediaId, workspaceId)

  if (!media || media.status === MediaStatus.DELETED) {
    throw MediaError.notFound()
  }

  return media
}

const toPreviewAssetResponse = async (asset: GeneratedAsset): Promise<MediaPreviewAssetResponseData> => ({
  id: asset.id,
  url: await storageService.createPresignedGetUrl(asset.s3Bucket, asset.s3Key),
  assetType: asset.assetType as MediaPreviewAssetResponseData['assetType'],
  mimeType: asset.mimeType,
  fileSizeBytes: asset.fileSizeBytes?.toString() ?? null,
  metadata: asset.metadata,
  expiresInSeconds: storageService.PRESIGNED_DOWNLOAD_EXPIRES_SECONDS
})

export const getMedia = async (workspaceId: string, mediaId: string): Promise<MediaDetailResponseData> => {
  const media = await mediaRepo.findMediaWithPreviewAssetsByIdInWorkspace(mediaId, workspaceId)

  if (!media || media.status === MediaStatus.DELETED) {
    throw MediaError.notFound()
  }

  const latestAssets = new Map<GeneratedAsset['assetType'], GeneratedAsset>()

  for (const asset of media.generatedAssets) {
    if (!latestAssets.has(asset.assetType)) {
      latestAssets.set(asset.assetType, asset)
    }
  }

  const latestSprite = latestAssets.get('THUMBNAIL_SPRITE')
  const thumbnailSprites = latestSprite
    ? media.generatedAssets
        .filter(
          (asset) =>
            asset.assetType === 'THUMBNAIL_SPRITE' &&
            (latestSprite.jobId ? asset.jobId === latestSprite.jobId : asset.id === latestSprite.id)
        )
        .sort((left, right) => {
          const leftIndex = getSheetIndex(left)
          const rightIndex = getSheetIndex(right)

          return leftIndex - rightIndex
        })
    : []

  const previews: MediaPreviewAssetsResponseData = {
    thumbnail: latestAssets.get('THUMBNAIL') ? await toPreviewAssetResponse(latestAssets.get('THUMBNAIL')!) : null,
    thumbnailSprites: await Promise.all(thumbnailSprites.map(toPreviewAssetResponse)),
    waveformPeaks: latestAssets.get('WAVEFORM_PEAKS')
      ? await toPreviewAssetResponse(latestAssets.get('WAVEFORM_PEAKS')!)
      : null
  }

  return {
    ...toMediaResponseData(media),
    previews
  }
}

const getSheetIndex = (asset: GeneratedAsset): number => {
  if (!asset.metadata || Array.isArray(asset.metadata) || typeof asset.metadata !== 'object') {
    return Number.MAX_SAFE_INTEGER
  }

  const sheetIndex = asset.metadata.sheetIndex

  return typeof sheetIndex === 'number' ? sheetIndex : Number.MAX_SAFE_INTEGER
}

export const updateMedia = async (
  workspaceId: string,
  userId: string,
  mediaId: string,
  data: UpdateMediaBody
): Promise<Media> => {
  const media = await getUploaderOwnedMedia(workspaceId, userId, mediaId)

  if (media.status === MediaStatus.DELETED) {
    throw MediaError.notFound()
  }

  return mediaRepo.updateMedia(media.id, data)
}

export const deleteMedia = async (workspaceId: string, userId: string, mediaId: string): Promise<void> => {
  const media = await getUploaderOwnedMedia(workspaceId, userId, mediaId)

  if (media.status === MediaStatus.DELETED) {
    return
  }

  if (media.status === MediaStatus.UPLOADING) {
    await abortUpload(workspaceId, userId, mediaId)
    return
  }

  await storageService.deleteObject(media.s3Bucket, media.s3Key)
  await mediaRepo.updateMedia(media.id, {
    uploadId: null,
    status: MediaStatus.DELETED
  })
}

export const createDownloadUrl = async (workspaceId: string, mediaId: string): Promise<CreateDownloadUrlResult> => {
  const media = await getWorkspaceMedia(workspaceId, mediaId)

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

export const createPreviewUrl = async (workspaceId: string, mediaId: string): Promise<CreateDownloadUrlResult> => {
  const media = await getWorkspaceMedia(workspaceId, mediaId)

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
  const media = await getUploaderOwnedMedia(input.workspaceId, input.userId, input.mediaId)

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

  const previewJobDrafts = mediaPreviewsService.createPreviewJobDrafts(media)
  const { media: completedMedia, jobs: createdPreviewJobs } = await mediaRepo.completeUploadAndCreateJobs({
    id: media.id,
    userId: input.userId,
    mediaData: {
      s3Etag: objectMetadata.etag,
      uploadId: null,
      title: media.title ?? media.originalFilename,
      ...(input.duration !== undefined ? { duration: input.duration } : {}),
      ...(input.width !== undefined ? { width: input.width } : {}),
      ...(input.height !== undefined ? { height: input.height } : {}),
      status: MediaStatus.UPLOADED
    },
    jobs: previewJobDrafts.map((draft) => draft.data)
  })

  if (completedMedia) {
    if (createdPreviewJobs.length > 0) {
      await mediaPreviewsService.publishPreviewJobs(
        completedMedia,
        createdPreviewJobs.map((job, index) => ({
          kind: previewJobDrafts[index].kind,
          job
        }))
      )
    }

    return { media: completedMedia }
  }

  const currentMedia = await mediaRepo.findMediaByIdInWorkspace(media.id, input.workspaceId)

  if (currentMedia?.status === MediaStatus.UPLOADED) {
    return { media: currentMedia }
  }

  if (currentMedia?.status === MediaStatus.DELETED) {
    await storageService.deleteObject(media.s3Bucket, media.s3Key)
    throw MediaError.invalidState('Media upload was aborted before completion')
  }

  throw MediaError.invalidState('Media upload state changed before completion')
}

export const abortUpload = async (workspaceId: string, userId: string, mediaId: string): Promise<AbortUploadResult> => {
  let media = await getUploaderOwnedMedia(workspaceId, userId, mediaId)

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
      media = (await mediaRepo.findMediaByIdInWorkspace(media.id, workspaceId)) ?? media
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
