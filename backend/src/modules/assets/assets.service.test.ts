import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GeneratedAsset } from '../../infrastructure/db/generated/prisma/client'

const findAssetsByUserIdMock =
  jest.fn<
    (
      filters: unknown,
      skip: number,
      take: number,
      sortBy: string,
      sortOrder: string
    ) => Promise<[GeneratedAsset[], number]>
  >()
const findAssetByIdMock = jest.fn<(id: string) => Promise<GeneratedAsset | null>>()
const deleteAssetMock = jest.fn<(id: string) => Promise<GeneratedAsset>>()
const createPresignedGetUrlMock = jest.fn<(bucket: string, key: string) => Promise<string>>()
const deleteObjectMock = jest.fn<(bucket: string, key: string) => Promise<void>>()

jest.unstable_mockModule('./assets.repository', () => ({
  deleteAsset: deleteAssetMock,
  findAssetById: findAssetByIdMock,
  findAssetsByUserId: findAssetsByUserIdMock
}))

jest.unstable_mockModule('../../infrastructure/s3/uploader', () => ({
  PRESIGNED_DOWNLOAD_EXPIRES_SECONDS: 900,
  createPresignedGetUrl: createPresignedGetUrlMock,
  deleteObject: deleteObjectMock
}))

const assetsService = await import('./assets.service')

const userId = '00000000-0000-4000-8000-000000000001'
const otherUserId = '00000000-0000-4000-8000-000000000002'
const assetId = '00000000-0000-4000-8000-000000000003'
const mediaId = '00000000-0000-4000-8000-000000000004'
const transcriptId = '00000000-0000-4000-8000-000000000005'
const chapterId = '00000000-0000-4000-8000-000000000006'
const now = new Date('2026-06-07T10:00:00.000Z')

const createAsset = (overrides: Partial<GeneratedAsset> = {}): GeneratedAsset => ({
  id: assetId,
  userId,
  mediaId,
  transcriptId,
  chapterId: null,
  assetType: 'SUBTITLE_SRT',
  transcriptVersion: 2,
  s3Bucket: 'avcms-media',
  s3Key: 'generated/users/user/subtitle.srt',
  s3Region: 'us-east-1',
  s3Etag: '"etag"',
  mimeType: 'application/x-subrip',
  fileSizeBytes: BigInt(1024),
  metadata: { format: 'srt' },
  createdAt: now,
  ...overrides
})

describe('assets service', () => {
  beforeEach(() => {
    findAssetsByUserIdMock.mockReset()
    findAssetByIdMock.mockReset()
    deleteAssetMock.mockReset()
    createPresignedGetUrlMock.mockReset()
    deleteObjectMock.mockReset()
  })

  it('lists assets with filters and pagination', async () => {
    findAssetsByUserIdMock.mockResolvedValue([[createAsset()], 1])

    const result = await assetsService.listAssets(userId, {
      page: 2,
      limit: 10,
      assetType: 'SUBTITLE_SRT',
      mediaId,
      transcriptId,
      chapterId,
      sortBy: 'assetType',
      sortOrder: 'asc'
    })

    expect(findAssetsByUserIdMock).toHaveBeenCalledWith(
      {
        userId,
        assetType: 'SUBTITLE_SRT',
        mediaId,
        transcriptId,
        chapterId
      },
      10,
      10,
      'assetType',
      'asc'
    )
    expect(result).toEqual({
      items: [
        {
          id: assetId,
          mediaId,
          transcriptId,
          chapterId: null,
          assetType: 'SUBTITLE_SRT',
          transcriptVersion: 2,
          mimeType: 'application/x-subrip',
          fileSizeBytes: '1024',
          metadata: { format: 'srt' },
          createdAt: now
        }
      ],
      total: 1,
      page: 2,
      limit: 10,
      totalPages: 1
    })
  })

  it('creates a download url for an owned asset', async () => {
    findAssetByIdMock.mockResolvedValue(createAsset())
    createPresignedGetUrlMock.mockResolvedValue('https://storage.example.com/generated/subtitle.srt')

    const result = await assetsService.createDownloadUrl(userId, assetId)

    expect(createPresignedGetUrlMock).toHaveBeenCalledWith('avcms-media', 'generated/users/user/subtitle.srt')
    expect(result).toEqual({
      url: 'https://storage.example.com/generated/subtitle.srt',
      expiresInSeconds: 900
    })
  })

  it('rejects download when the asset is missing', async () => {
    findAssetByIdMock.mockResolvedValue(null)

    await expect(assetsService.createDownloadUrl(userId, assetId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'ASSET_NOT_FOUND'
    })
    expect(createPresignedGetUrlMock).not.toHaveBeenCalled()
  })

  it('rejects download when the asset belongs to another user', async () => {
    findAssetByIdMock.mockResolvedValue(createAsset({ userId: otherUserId }))

    await expect(assetsService.createDownloadUrl(userId, assetId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })
    expect(createPresignedGetUrlMock).not.toHaveBeenCalled()
  })

  it('wraps storage errors when creating a download url', async () => {
    findAssetByIdMock.mockResolvedValue(createAsset())
    createPresignedGetUrlMock.mockRejectedValue(new Error('presign failed'))

    await expect(assetsService.createDownloadUrl(userId, assetId)).rejects.toMatchObject({
      statusCode: 502,
      code: 'ASSET_STORAGE_FAILURE',
      message: 'presign failed'
    })
  })

  it('deletes an owned asset from storage and database', async () => {
    const asset = createAsset()
    findAssetByIdMock.mockResolvedValue(asset)
    deleteObjectMock.mockResolvedValue()
    deleteAssetMock.mockResolvedValue(asset)

    await assetsService.deleteAsset(userId, assetId)

    expect(deleteObjectMock).toHaveBeenCalledWith('avcms-media', 'generated/users/user/subtitle.srt')
    expect(deleteAssetMock).toHaveBeenCalledWith(assetId)
  })

  it('rejects delete when the asset is missing', async () => {
    findAssetByIdMock.mockResolvedValue(null)

    await expect(assetsService.deleteAsset(userId, assetId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'ASSET_NOT_FOUND'
    })
    expect(deleteObjectMock).not.toHaveBeenCalled()
    expect(deleteAssetMock).not.toHaveBeenCalled()
  })

  it('rejects delete when the asset belongs to another user', async () => {
    findAssetByIdMock.mockResolvedValue(createAsset({ userId: otherUserId }))

    await expect(assetsService.deleteAsset(userId, assetId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })
    expect(deleteObjectMock).not.toHaveBeenCalled()
    expect(deleteAssetMock).not.toHaveBeenCalled()
  })

  it('still deletes the database row when storage treats a missing object as success', async () => {
    const asset = createAsset()
    findAssetByIdMock.mockResolvedValue(asset)
    deleteObjectMock.mockResolvedValue()
    deleteAssetMock.mockResolvedValue(asset)

    await assetsService.deleteAsset(userId, assetId)

    expect(deleteAssetMock).toHaveBeenCalledWith(assetId)
  })

  it('does not delete the database row when storage deletion fails', async () => {
    findAssetByIdMock.mockResolvedValue(createAsset())
    deleteObjectMock.mockRejectedValue(new Error('delete failed'))

    await expect(assetsService.deleteAsset(userId, assetId)).rejects.toMatchObject({
      statusCode: 502,
      code: 'ASSET_STORAGE_FAILURE',
      message: 'delete failed'
    })
    expect(deleteAssetMock).not.toHaveBeenCalled()
  })
})
