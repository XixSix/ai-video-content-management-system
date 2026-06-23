import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { config } from '../../config'
import type { Media } from '../../infrastructure/db/generated/prisma/client'
import { MediaError } from './media.error'

const createMediaMock = jest.fn<(data: unknown) => Promise<Media>>()
const findMediaByWorkspaceIdMock = jest.fn()
const findMediaByIdInWorkspaceMock = jest.fn<(id: string, workspaceId: string) => Promise<Media | null>>()
const updateMediaMock = jest.fn<(id: string, data: unknown) => Promise<Media>>()
const updateUploadingMediaMock = jest.fn<(id: string, userId: string, data: unknown) => Promise<Media | null>>()
const createPresignedPutUrlMock = jest.fn<(bucket: string, key: string, mimeType: string) => Promise<string>>()
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

jest.unstable_mockModule('./media.repository', () => ({
  createMedia: createMediaMock,
  findMediaByWorkspaceId: findMediaByWorkspaceIdMock,
  findMediaByIdInWorkspace: findMediaByIdInWorkspaceMock,
  updateMedia: updateMediaMock,
  updateUploadingMedia: updateUploadingMediaMock
}))

jest.unstable_mockModule('../../infrastructure/s3/uploader', () => ({
  PRESIGNED_DOWNLOAD_EXPIRES_SECONDS: 900,
  PRESIGNED_UPLOAD_EXPIRES_SECONDS: 900,
  abortMultipartUpload: abortMultipartUploadMock,
  completeMultipartUpload: completeMultipartUploadMock,
  createMultipartUpload: createMultipartUploadMock,
  createPresignedPreviewUrl: createPresignedPreviewUrlMock,
  createPresignedDownloadUrl: createPresignedDownloadUrlMock,
  createPresignedPutUrl: createPresignedPutUrlMock,
  createPresignedUploadPartUrls: createPresignedUploadPartUrlsMock,
  deleteObject: deleteObjectMock,
  headObject: headObjectMock
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

describe('media upload service', () => {
  beforeEach(() => {
    createMediaMock.mockReset()
    findMediaByWorkspaceIdMock.mockReset()
    findMediaByIdInWorkspaceMock.mockReset()
    updateMediaMock.mockReset()
    updateUploadingMediaMock.mockReset()
    createPresignedPutUrlMock.mockReset()
    createPresignedPreviewUrlMock.mockReset()
    createPresignedDownloadUrlMock.mockReset()
    createMultipartUploadMock.mockReset()
    createPresignedUploadPartUrlsMock.mockReset()
    completeMultipartUploadMock.mockReset()
    abortMultipartUploadMock.mockReset()
    deleteObjectMock.mockReset()
    headObjectMock.mockReset()

    createMediaMock.mockResolvedValue(createMedia())
    findMediaByWorkspaceIdMock.mockResolvedValue([[createMedia({ status: 'UPLOADED' })], 1])
    findMediaByIdInWorkspaceMock.mockResolvedValue(createMedia({ status: 'UPLOADED' }))
    updateMediaMock.mockImplementation(async (_id, data) => createMedia(data as Partial<Media>))
    updateUploadingMediaMock.mockImplementation(async (_id, _userId, data) => createMedia(data as Partial<Media>))
    createPresignedPutUrlMock.mockResolvedValue('https://storage.example.com/upload')
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

  it('lets a workspace member read media uploaded by another member', async () => {
    const sharedMedia = createMedia({
      userId: otherUserId,
      status: 'UPLOADED'
    })
    findMediaByIdInWorkspaceMock.mockResolvedValue(sharedMedia)

    await expect(mediaService.getMedia(workspaceId, mediaId)).resolves.toEqual(sharedMedia)
    expect(findMediaByIdInWorkspaceMock).toHaveBeenCalledWith(mediaId, workspaceId)
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
    findMediaByIdInWorkspaceMock.mockResolvedValue(null)

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
    updateUploadingMediaMock.mockResolvedValue(uploadedMedia)

    const result = await mediaService.completeUpload({
      userId,
      workspaceId,
      mediaId,
      duration: 120.5,
      width: 1920,
      height: 1080
    })

    expect(updateUploadingMediaMock).toHaveBeenCalledWith(mediaId, userId, {
      s3Etag: '"etag"',
      uploadId: null,
      title: 'upload.mp4',
      duration: 120.5,
      width: 1920,
      height: 1080,
      status: 'UPLOADED'
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
    updateUploadingMediaMock.mockResolvedValue(uploadedMedia)
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
    updateUploadingMediaMock.mockResolvedValue(null)

    await expect(mediaService.completeUpload({ workspaceId, userId, mediaId })).rejects.toMatchObject({
      code: 'INVALID_MEDIA_STATE'
    })
    expect(deleteObjectMock).toHaveBeenCalled()
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
