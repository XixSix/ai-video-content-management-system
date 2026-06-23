import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { config } from '../../config'
import type { GeneratedAsset, Media } from '../../infrastructure/db/generated/prisma/client'
import { MediaError } from './media.error'

const createMediaMock = jest.fn<(data: unknown) => Promise<Media>>()
const findMediaByWorkspaceIdMock = jest.fn()
const findMediaByIdInWorkspaceMock = jest.fn<(id: string, workspaceId: string) => Promise<Media | null>>()
const findMediaWithPreviewAssetsByIdInWorkspaceMock = jest.fn()
const updateMediaMock = jest.fn<(id: string, data: unknown) => Promise<Media>>()
const updateUploadingMediaMock = jest.fn<(id: string, userId: string, data: unknown) => Promise<Media | null>>()
const completeUploadAndCreateJobsMock = jest.fn()
const createPresignedPutUrlMock = jest.fn<(bucket: string, key: string, mimeType: string) => Promise<string>>()
const createPresignedGetUrlMock = jest.fn<(bucket: string, key: string) => Promise<string>>()
const createPresignedPreviewUrlMock = jest.fn<(bucket: string, key: string) => Promise<string>>()
const createPresignedDownloadUrlMock = jest.fn<(bucket: string, key: string, filename: string) => Promise<string>>()
const createMultipartUploadMock = jest.fn<(bucket: string, key: string, mimeType: string) => Promise<string>>()
const createPresignedUploadPartUrlsMock =
  jest.fn<
    (
      bucket: string,
      key: string,
      uploadId: string,
      partCount: number
    ) => Promise<Array<{ partNumber: number; url: string }>>
  >()
const completeMultipartUploadMock =
  jest.fn<(bucket: string, key: string, uploadId: string, parts: readonly unknown[]) => Promise<void>>()
const abortMultipartUploadMock = jest.fn<(bucket: string, key: string, uploadId: string) => Promise<void>>()
const deleteObjectMock = jest.fn<(bucket: string, key: string) => Promise<void>>()
const headObjectMock =
  jest.fn<(bucket: string, key: string) => Promise<{ contentLength?: number; contentType?: string; etag?: string }>>()
const createPreviewJobDraftsMock = jest.fn()
const publishPreviewJobsMock = jest.fn<(media: Media, jobs: unknown[]) => Promise<void>>()

jest.unstable_mockModule('./media.repository', () => ({
  createMedia: createMediaMock,
  completeUploadAndCreateJobs: completeUploadAndCreateJobsMock,
  findMediaByWorkspaceId: findMediaByWorkspaceIdMock,
  findMediaByIdInWorkspace: findMediaByIdInWorkspaceMock,
  findMediaWithPreviewAssetsByIdInWorkspace: findMediaWithPreviewAssetsByIdInWorkspaceMock,
  updateMedia: updateMediaMock,
  updateUploadingMedia: updateUploadingMediaMock
}))

jest.unstable_mockModule('../../infrastructure/s3/uploader', () => ({
  PRESIGNED_DOWNLOAD_EXPIRES_SECONDS: 900,
  PRESIGNED_UPLOAD_EXPIRES_SECONDS: 900,
  abortMultipartUpload: abortMultipartUploadMock,
  completeMultipartUpload: completeMultipartUploadMock,
  createMultipartUpload: createMultipartUploadMock,
  createPresignedGetUrl: createPresignedGetUrlMock,
  createPresignedPreviewUrl: createPresignedPreviewUrlMock,
  createPresignedDownloadUrl: createPresignedDownloadUrlMock,
  createPresignedPutUrl: createPresignedPutUrlMock,
  createPresignedUploadPartUrls: createPresignedUploadPartUrlsMock,
  deleteObject: deleteObjectMock,
  headObject: headObjectMock
}))

jest.unstable_mockModule('../media-previews/media-previews.service', () => ({
  createPreviewJobDrafts: createPreviewJobDraftsMock,
  publishPreviewJobs: publishPreviewJobsMock
}))

const mediaService = await import('./media.service')

const userId = '00000000-0000-4000-8000-000000000001'
const otherUserId = '00000000-0000-4000-8000-000000000002'
const workspaceId = '00000000-0000-4000-8000-000000000003'
const mediaId = '00000000-0000-4000-8000-000000000004'
const now = new Date('2026-06-19T10:00:00.000Z')

const createMedia = (overrides: Partial<Media> = {}): Media => ({
  id: mediaId,
  userId,
  workspaceId,
  type: 'VIDEO',
  title: 'Upload',
  description: null,
  originalFilename: 'upload.mp4',
  s3Bucket: 'vidpilot-media',
  s3Key: `uploads/workspaces/${workspaceId}/users/${userId}/videos/session/original.mp4`,
  s3Region: 'us-east-1',
  s3Etag: null,
  uploadId: null,
  duration: null,
  fileSizeBytes: BigInt(1024),
  mimeType: 'video/mp4',
  width: null,
  height: null,
  metadata: null,
  status: 'UPLOADING',
  createdAt: now,
  updatedAt: now,
  ...overrides
})

const createThumbnail = (overrides: Partial<GeneratedAsset> = {}): GeneratedAsset => ({
  id: '00000000-0000-4000-8000-000000000005',
  userId,
  mediaId,
  projectId: null,
  transcriptId: null,
  chapterId: null,
  shortClipId: null,
  jobId: null,
  assetType: 'THUMBNAIL',
  transcriptVersion: null,
  s3Bucket: 'vidpilot-media',
  s3Key: 'generated/thumbnail.jpg',
  s3Region: 'us-east-1',
  s3Etag: '"thumbnail-etag"',
  mimeType: 'image/jpeg',
  fileSizeBytes: BigInt(2048),
  metadata: { width: 320, height: 180 },
  createdAt: now,
  ...overrides
})

describe('media upload service', () => {
  beforeEach(() => {
    createMediaMock.mockReset()
    findMediaByWorkspaceIdMock.mockReset()
    findMediaByIdInWorkspaceMock.mockReset()
    findMediaWithPreviewAssetsByIdInWorkspaceMock.mockReset()
    updateMediaMock.mockReset()
    updateUploadingMediaMock.mockReset()
    completeUploadAndCreateJobsMock.mockReset()
    createPresignedPutUrlMock.mockReset()
    createPresignedGetUrlMock.mockReset()
    createPresignedPreviewUrlMock.mockReset()
    createPresignedDownloadUrlMock.mockReset()
    createMultipartUploadMock.mockReset()
    createPresignedUploadPartUrlsMock.mockReset()
    completeMultipartUploadMock.mockReset()
    abortMultipartUploadMock.mockReset()
    deleteObjectMock.mockReset()
    headObjectMock.mockReset()
    createPreviewJobDraftsMock.mockReset()
    publishPreviewJobsMock.mockReset()

    createMediaMock.mockResolvedValue(createMedia())
    findMediaByWorkspaceIdMock.mockResolvedValue([[{ ...createMedia({ status: 'UPLOADED' }), generatedAssets: [] }], 1])
    findMediaByIdInWorkspaceMock.mockResolvedValue(createMedia({ status: 'UPLOADED' }))
    findMediaWithPreviewAssetsByIdInWorkspaceMock.mockResolvedValue({
      ...createMedia({ status: 'UPLOADED' }),
      generatedAssets: []
    })
    updateMediaMock.mockImplementation(async (_id, data) => createMedia(data as Partial<Media>))
    updateUploadingMediaMock.mockImplementation(async (_id, _userId, data) => createMedia(data as Partial<Media>))
    completeUploadAndCreateJobsMock.mockImplementation(async ({ mediaData }) => ({
      media: createMedia(mediaData as Partial<Media>),
      jobs: []
    }))
    createPresignedPutUrlMock.mockResolvedValue('https://storage.example.com/upload')
    createPresignedGetUrlMock.mockResolvedValue('https://storage.example.com/generated/thumbnail.jpg')
    createPresignedPreviewUrlMock.mockResolvedValue('https://storage.example.com/preview')
    createPresignedDownloadUrlMock.mockResolvedValue('https://storage.example.com/download')
    createMultipartUploadMock.mockResolvedValue('multipart-upload-id')
    createPresignedUploadPartUrlsMock.mockResolvedValue([{ partNumber: 1, url: 'https://storage.example.com/part/1' }])
    completeMultipartUploadMock.mockResolvedValue()
    abortMultipartUploadMock.mockResolvedValue()
    deleteObjectMock.mockResolvedValue()
    headObjectMock.mockResolvedValue({
      contentLength: 1024,
      contentType: 'video/mp4',
      etag: '"etag"'
    })
    createPreviewJobDraftsMock.mockReturnValue([])
    publishPreviewJobsMock.mockResolvedValue()
  })

  it('lists all non-deleted media in the selected workspace', async () => {
    await expect(
      mediaService.listMedia(workspaceId, {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
    ).resolves.toMatchObject({
      total: 1,
      page: 1,
      limit: 10
    })
    expect(findMediaByWorkspaceIdMock).toHaveBeenCalledWith(workspaceId, 0, 10, undefined, 'createdAt', 'desc')
  })

  it('includes the latest generated thumbnail in media list items', async () => {
    findMediaByWorkspaceIdMock.mockResolvedValue([
      [
        {
          ...createMedia({ status: 'UPLOADED' }),
          generatedAssets: [createThumbnail()]
        }
      ],
      1
    ])

    const result = await mediaService.listMedia(workspaceId, {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })

    expect(result.items[0].thumbnail).toEqual({
      id: '00000000-0000-4000-8000-000000000005',
      url: 'https://storage.example.com/generated/thumbnail.jpg',
      assetType: 'THUMBNAIL',
      mimeType: 'image/jpeg',
      fileSizeBytes: '2048',
      metadata: { width: 320, height: 180 },
      expiresInSeconds: 900
    })
    expect(createPresignedGetUrlMock).toHaveBeenCalledWith('vidpilot-media', 'generated/thumbnail.jpg')
  })

  it('lets a workspace member read media uploaded by another member', async () => {
    const sharedMedia = createMedia({
      userId: otherUserId,
      status: 'UPLOADED'
    })
    findMediaWithPreviewAssetsByIdInWorkspaceMock.mockResolvedValue({
      ...sharedMedia,
      generatedAssets: []
    })

    await expect(mediaService.getMedia(workspaceId, mediaId)).resolves.toMatchObject({
      id: mediaId,
      workspaceId,
      previews: {
        thumbnail: null,
        thumbnailSprites: [],
        waveformPeaks: null
      }
    })
    expect(findMediaWithPreviewAssetsByIdInWorkspaceMock).toHaveBeenCalledWith(mediaId, workspaceId)
  })

  it('returns latest preview assets with media details for Studio', async () => {
    findMediaWithPreviewAssetsByIdInWorkspaceMock.mockResolvedValue({
      ...createMedia({ status: 'UPLOADED' }),
      generatedAssets: [
        createThumbnail(),
        createThumbnail({
          id: '00000000-0000-4000-8000-000000000006',
          assetType: 'THUMBNAIL_SPRITE',
          jobId: '00000000-0000-4000-8000-000000000008',
          s3Key: 'generated/sprite-001.jpg',
          metadata: { sheetIndex: 1 }
        }),
        createThumbnail({
          id: '00000000-0000-4000-8000-000000000009',
          assetType: 'THUMBNAIL_SPRITE',
          jobId: '00000000-0000-4000-8000-000000000008',
          s3Key: 'generated/sprite-000.jpg',
          metadata: { sheetIndex: 0 }
        }),
        createThumbnail({
          id: '00000000-0000-4000-8000-000000000010',
          assetType: 'THUMBNAIL_SPRITE',
          jobId: '00000000-0000-4000-8000-000000000011',
          s3Key: 'generated/old-sprite.jpg',
          metadata: { sheetIndex: 0 }
        }),
        createThumbnail({
          id: '00000000-0000-4000-8000-000000000007',
          assetType: 'WAVEFORM_PEAKS',
          s3Key: 'generated/waveform.json',
          mimeType: 'application/json'
        })
      ]
    })
    createPresignedGetUrlMock
      .mockResolvedValueOnce('https://storage.example.com/generated/thumbnail.jpg')
      .mockResolvedValueOnce('https://storage.example.com/generated/sprite-000.jpg')
      .mockResolvedValueOnce('https://storage.example.com/generated/sprite-001.jpg')
      .mockResolvedValueOnce('https://storage.example.com/generated/waveform.json')

    const result = await mediaService.getMedia(workspaceId, mediaId)

    expect(result.previews.thumbnail?.assetType).toBe('THUMBNAIL')
    expect(result.previews.thumbnailSprites.map((asset) => asset.metadata)).toEqual([
      { sheetIndex: 0 },
      { sheetIndex: 1 }
    ])
    expect(result.previews.thumbnailSprites).toHaveLength(2)
    expect(result.previews.waveformPeaks?.mimeType).toBe('application/json')
  })

  it('lets a workspace member create a download URL for shared media', async () => {
    findMediaByIdInWorkspaceMock.mockResolvedValue(
      createMedia({
        userId: otherUserId,
        status: 'UPLOADED'
      })
    )

    await expect(mediaService.createDownloadUrl(workspaceId, mediaId)).resolves.toEqual({
      url: 'https://storage.example.com/download',
      expiresInSeconds: 900
    })
    expect(createPresignedDownloadUrlMock).toHaveBeenCalledWith(
      'vidpilot-media',
      `uploads/workspaces/${workspaceId}/users/${userId}/videos/session/original.mp4`,
      'Upload'
    )
  })

  it('falls back to the original filename when downloading legacy media without a title', async () => {
    findMediaByIdInWorkspaceMock.mockResolvedValue(
      createMedia({
        title: null,
        status: 'UPLOADED'
      })
    )

    await mediaService.createDownloadUrl(workspaceId, mediaId)

    expect(createPresignedDownloadUrlMock).toHaveBeenCalledWith('vidpilot-media', expect.any(String), 'upload.mp4')
  })

  it('lets a workspace member create an inline preview URL for shared media', async () => {
    findMediaByIdInWorkspaceMock.mockResolvedValue(
      createMedia({
        userId: otherUserId,
        status: 'UPLOADED'
      })
    )

    await expect(mediaService.createPreviewUrl(workspaceId, mediaId)).resolves.toEqual({
      url: 'https://storage.example.com/preview',
      expiresInSeconds: 900
    })
    expect(createPresignedPreviewUrlMock).toHaveBeenCalledWith(
      'vidpilot-media',
      `uploads/workspaces/${workspaceId}/users/${userId}/videos/session/original.mp4`
    )
  })

  it('hides media from users outside its workspace', async () => {
    findMediaWithPreviewAssetsByIdInWorkspaceMock.mockResolvedValue(null)

    await expect(mediaService.getMedia(workspaceId, mediaId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'MEDIA_NOT_FOUND'
    })
  })

  it('still restricts metadata updates to the uploader', async () => {
    findMediaByIdInWorkspaceMock.mockResolvedValue(createMedia({ userId: otherUserId, status: 'UPLOADED' }))

    await expect(mediaService.updateMedia(workspaceId, userId, mediaId, { title: 'Renamed' })).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })
    expect(updateMediaMock).not.toHaveBeenCalled()
  })

  it('creates a workspace-scoped single upload', async () => {
    const result = await mediaService.createUploadUrl({
      workspaceId,
      userId,
      mediaType: 'VIDEO',
      originalFilename: 'upload.mp4',
      mimeType: 'video/mp4',
      fileSizeBytes: 1024
    })

    expect(createMediaMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        workspaceId,
        type: 'VIDEO',
        status: 'UPLOADING',
        s3Key: expect.stringMatching(
          new RegExp(`^uploads/workspaces/${workspaceId}/users/${userId}/videos/.+/original\\.mp4$`)
        )
      })
    )
    expect(result).toEqual({
      mode: 'SINGLE',
      mediaId,
      url: 'https://storage.example.com/upload',
      headers: {
        'Content-Type': 'video/mp4'
      },
      expiresInSeconds: 900
    })
  })

  it('marks a single upload deleted when presigning fails', async () => {
    createPresignedPutUrlMock.mockRejectedValue(new Error('presign failed'))

    await expect(
      mediaService.createUploadUrl({
        workspaceId,
        userId,
        mediaType: 'VIDEO',
        originalFilename: 'upload.mp4',
        mimeType: 'video/mp4',
        fileSizeBytes: 1024
      })
    ).rejects.toThrow('presign failed')
    expect(updateUploadingMediaMock).toHaveBeenCalledWith(mediaId, userId, {
      uploadId: null,
      status: 'DELETED'
    })
  })

  it('creates the database row before opening a multipart upload', async () => {
    const fileSizeBytes = config.upload.multipartThresholdBytes + 1
    createMediaMock.mockResolvedValue(createMedia({ fileSizeBytes: BigInt(fileSizeBytes) }))

    const result = await mediaService.createUploadUrl({
      workspaceId,
      userId,
      mediaType: 'VIDEO',
      originalFilename: 'upload.mp4',
      mimeType: 'video/mp4',
      fileSizeBytes
    })

    expect(createMediaMock.mock.invocationCallOrder[0]).toBeLessThan(
      createMultipartUploadMock.mock.invocationCallOrder[0]
    )
    expect(updateUploadingMediaMock).toHaveBeenCalledWith(mediaId, userId, {
      uploadId: 'multipart-upload-id'
    })
    expect(createPresignedUploadPartUrlsMock).toHaveBeenCalledWith(
      'vidpilot-media',
      expect.any(String),
      'multipart-upload-id',
      Math.ceil(fileSizeBytes / config.upload.multipartPartSizeBytes)
    )
    expect(result).toEqual({
      mode: 'MULTIPART',
      mediaId,
      partSizeBytes: config.upload.multipartPartSizeBytes,
      parts: [{ partNumber: 1, url: 'https://storage.example.com/part/1' }],
      expiresInSeconds: 900
    })
  })

  it('aborts storage and deletes the row state when multipart URL generation fails', async () => {
    const fileSizeBytes = config.upload.multipartThresholdBytes + 1
    createMediaMock.mockResolvedValue(createMedia({ fileSizeBytes: BigInt(fileSizeBytes) }))
    createPresignedUploadPartUrlsMock.mockRejectedValue(new Error('presign parts failed'))

    await expect(
      mediaService.createUploadUrl({
        workspaceId,
        userId,
        mediaType: 'VIDEO',
        originalFilename: 'upload.mp4',
        mimeType: 'video/mp4',
        fileSizeBytes
      })
    ).rejects.toThrow('presign parts failed')
    expect(abortMultipartUploadMock).toHaveBeenCalledWith('vidpilot-media', expect.any(String), 'multipart-upload-id')
    expect(updateUploadingMediaMock).toHaveBeenLastCalledWith(mediaId, userId, {
      uploadId: null,
      status: 'DELETED'
    })
  })

  it('retains the multipart upload id when compensation cleanup fails', async () => {
    const fileSizeBytes = config.upload.multipartThresholdBytes + 1
    createMediaMock.mockResolvedValue(createMedia({ fileSizeBytes: BigInt(fileSizeBytes) }))
    createPresignedUploadPartUrlsMock.mockRejectedValue(new Error('presign parts failed'))
    abortMultipartUploadMock.mockRejectedValue(new Error('abort failed'))

    await expect(
      mediaService.createUploadUrl({
        workspaceId,
        userId,
        mediaType: 'VIDEO',
        originalFilename: 'upload.mp4',
        mimeType: 'video/mp4',
        fileSizeBytes
      })
    ).rejects.toThrow('presign parts failed')
    expect(updateUploadingMediaMock).toHaveBeenLastCalledWith(mediaId, userId, {
      uploadId: 'multipart-upload-id',
      status: 'DELETED'
    })
  })

  it('completes a single upload and returns the persisted media', async () => {
    const uploadingMedia = createMedia({ title: null })
    const uploadedMedia = createMedia({ title: 'upload.mp4', status: 'UPLOADED', s3Etag: '"etag"' })
    findMediaByIdInWorkspaceMock.mockResolvedValue(uploadingMedia)
    completeUploadAndCreateJobsMock.mockResolvedValue({
      media: uploadedMedia,
      jobs: []
    })

    const result = await mediaService.completeUpload({
      userId,
      workspaceId,
      mediaId,
      duration: 120.5,
      width: 1920,
      height: 1080
    })

    expect(completeUploadAndCreateJobsMock).toHaveBeenCalledWith({
      id: mediaId,
      userId,
      mediaData: {
        s3Etag: '"etag"',
        uploadId: null,
        title: 'upload.mp4',
        duration: 120.5,
        width: 1920,
        height: 1080,
        status: 'UPLOADED'
      },
      jobs: []
    })
    expect(result).toEqual({ media: uploadedMedia })
    expect(findMediaByIdInWorkspaceMock).toHaveBeenCalledTimes(1)
  })

  it('returns an already uploaded media idempotently', async () => {
    const uploadedMedia = createMedia({ status: 'UPLOADED' })
    findMediaByIdInWorkspaceMock.mockResolvedValue(uploadedMedia)

    await expect(mediaService.completeUpload({ workspaceId, userId, mediaId })).resolves.toEqual({
      media: uploadedMedia
    })
    expect(headObjectMock).not.toHaveBeenCalled()
  })

  it('rejects completion by another user', async () => {
    findMediaByIdInWorkspaceMock.mockResolvedValue(createMedia({ userId: otherUserId }))

    await expect(mediaService.completeUpload({ workspaceId, userId, mediaId })).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })
  })

  it('recovers multipart completion when the upload session is gone but the object exists', async () => {
    const multipartMedia = createMedia({
      uploadId: 'multipart-upload-id',
      fileSizeBytes: BigInt(10 * 1024 * 1024)
    })
    const uploadedMedia = createMedia({
      uploadId: null,
      status: 'UPLOADED',
      fileSizeBytes: BigInt(10 * 1024 * 1024)
    })
    findMediaByIdInWorkspaceMock.mockResolvedValue(multipartMedia)
    completeUploadAndCreateJobsMock.mockResolvedValue({
      media: uploadedMedia,
      jobs: []
    })
    completeMultipartUploadMock.mockRejectedValue(MediaError.multipartUploadNotFound())
    headObjectMock.mockResolvedValue({
      contentLength: 10 * 1024 * 1024,
      contentType: 'video/mp4',
      etag: '"multipart-etag"'
    })

    const result = await mediaService.completeUpload({
      userId,
      workspaceId,
      mediaId,
      parts: [{ partNumber: 1, etag: '"part-etag"' }]
    })

    expect(result).toEqual({ media: uploadedMedia })
  })

  it('deletes an invalid object and marks media failed', async () => {
    findMediaByIdInWorkspaceMock.mockResolvedValue(createMedia())
    headObjectMock.mockResolvedValue({
      contentLength: 2048,
      contentType: 'video/mp4'
    })

    await expect(mediaService.completeUpload({ workspaceId, userId, mediaId })).rejects.toMatchObject({
      code: 'INVALID_MEDIA_UPLOAD'
    })
    expect(deleteObjectMock).toHaveBeenCalled()
    expect(updateUploadingMediaMock).toHaveBeenCalledWith(mediaId, userId, {
      uploadId: null,
      status: 'FAILED'
    })
  })

  it('cleans an object when abort wins the completion race', async () => {
    findMediaByIdInWorkspaceMock
      .mockResolvedValueOnce(createMedia())
      .mockResolvedValueOnce(createMedia({ status: 'DELETED' }))
    completeUploadAndCreateJobsMock.mockResolvedValue({
      media: null,
      jobs: []
    })

    await expect(mediaService.completeUpload({ workspaceId, userId, mediaId })).rejects.toMatchObject({
      code: 'INVALID_MEDIA_STATE'
    })
    expect(deleteObjectMock).toHaveBeenCalled()
  })

  it('creates and publishes preview jobs for eligible media when upload completes', async () => {
    const uploadingMedia = createMedia({ type: 'VIDEO' })
    const uploadedMedia = createMedia({ status: 'UPLOADED', s3Etag: '"etag"' })
    const createdJob = {
      id: 'job-1',
      mediaId,
      userId,
      projectId: null,
      jobType: 'GENERATE_THUMBNAIL',
      status: 'PENDING',
      progress: 0,
      currentStep: null,
      errorMessage: null,
      queueName: 'media_previews_queue',
      taskName: 'generate_thumbnail',
      externalTaskId: null,
      attemptCount: 0,
      input: null,
      output: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null
    }

    findMediaByIdInWorkspaceMock.mockResolvedValue(uploadingMedia)
    createPreviewJobDraftsMock.mockReturnValue([
      {
        kind: 'thumbnail',
        data: {
          mediaId,
          userId,
          jobType: 'GENERATE_THUMBNAIL'
        }
      }
    ])
    completeUploadAndCreateJobsMock.mockResolvedValue({
      media: uploadedMedia,
      jobs: [createdJob]
    })

    await mediaService.completeUpload({
      userId,
      workspaceId,
      mediaId
    })

    expect(createPreviewJobDraftsMock).toHaveBeenCalledWith(uploadingMedia)
    expect(publishPreviewJobsMock).toHaveBeenCalledWith(uploadedMedia, [
      {
        kind: 'thumbnail',
        job: createdJob
      }
    ])
  })

  it('aborts a multipart upload and clears its upload id', async () => {
    const deletedMedia = createMedia({
      status: 'DELETED',
      uploadId: 'multipart-upload-id'
    })
    findMediaByIdInWorkspaceMock.mockResolvedValue(createMedia({ uploadId: 'multipart-upload-id' }))
    updateUploadingMediaMock.mockResolvedValue(deletedMedia)

    await expect(mediaService.abortUpload(workspaceId, userId, mediaId)).resolves.toEqual({
      message: 'Media upload aborted successfully'
    })
    expect(updateUploadingMediaMock).toHaveBeenCalledWith(mediaId, userId, {
      status: 'DELETED'
    })
    expect(abortMultipartUploadMock).toHaveBeenCalled()
    expect(deleteObjectMock).toHaveBeenCalled()
    expect(updateMediaMock).toHaveBeenCalledWith(mediaId, {
      uploadId: null
    })
  })

  it('retries cleanup for an already deleted media', async () => {
    findMediaByIdInWorkspaceMock.mockResolvedValue(createMedia({ status: 'DELETED', uploadId: 'multipart-upload-id' }))

    await expect(mediaService.abortUpload(workspaceId, userId, mediaId)).resolves.toMatchObject({
      message: 'Media upload aborted successfully'
    })
    expect(abortMultipartUploadMock).toHaveBeenCalled()
    expect(deleteObjectMock).toHaveBeenCalled()
  })

  it('rejects aborting an uploaded media', async () => {
    findMediaByIdInWorkspaceMock.mockResolvedValue(createMedia({ status: 'UPLOADED' }))

    await expect(mediaService.abortUpload(workspaceId, userId, mediaId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'INVALID_MEDIA_STATE'
    })
    expect(deleteObjectMock).not.toHaveBeenCalled()
  })
})
