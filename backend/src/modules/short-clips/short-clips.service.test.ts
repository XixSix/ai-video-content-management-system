import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type {
  ClipCandidate,
  GeneratedAsset,
  Media,
  ProcessingJob,
  ShortClip,
  Transcript
} from '../../infrastructure/db/generated/prisma/client'

const findMediaByIdMock = jest.fn<(id: string) => Promise<Media | null>>()
const findLatestTranscriptByMediaIdAndUserIdMock =
  jest.fn<(mediaId: string, userId: string) => Promise<Transcript | null>>()
const findTranscriptByIdAndMediaIdAndUserIdMock =
  jest.fn<(transcriptId: string, mediaId: string, userId: string) => Promise<Transcript | null>>()
const countTranscriptSegmentsByTranscriptIdMock = jest.fn<(transcriptId: string) => Promise<number>>()
const findActiveShortClipJobByMediaIdAndUserIdMock =
  jest.fn<(mediaId: string, userId: string) => Promise<ProcessingJob | null>>()
const createProcessingJobMock = jest.fn<(data: unknown) => Promise<ProcessingJob>>()
const updateProcessingJobMock = jest.fn<(id: string, data: unknown) => Promise<ProcessingJob>>()
const findClipCandidatesByMediaIdAndUserIdMock =
  jest.fn<
    (
      filters: unknown,
      skip: number,
      take: number,
      sortBy: string,
      sortOrder: string
    ) => Promise<[ClipCandidate[], number]>
  >()
const findClipCandidateByIdMock = jest.fn<(id: string) => Promise<ClipCandidate | null>>()
const findShortClipsByMediaIdAndUserIdMock =
  jest.fn<
    (filters: unknown, skip: number, take: number, sortBy: string, sortOrder: string) => Promise<[ShortClip[], number]>
  >()
const findShortClipByIdMock = jest.fn<(id: string) => Promise<ShortClip | null>>()
const findLatestShortClipVideoAssetMock =
  jest.fn<(shortClipId: string, userId: string) => Promise<GeneratedAsset | null>>()
type PublishShortClipJobMockInput = {
  jobId: string
  mediaId: string
  userId: string
  transcriptId: string
  transcriptVersion: number
  preferences: unknown
}
const publishShortClipJobMock = jest.fn<(message: PublishShortClipJobMockInput) => Promise<void>>()
const createPresignedGetUrlMock = jest.fn<(bucket: string, key: string) => Promise<string>>()

jest.unstable_mockModule('./short-clips.repository', () => ({
  countTranscriptSegmentsByTranscriptId: countTranscriptSegmentsByTranscriptIdMock,
  createProcessingJob: createProcessingJobMock,
  findActiveShortClipJobByMediaIdAndUserId: findActiveShortClipJobByMediaIdAndUserIdMock,
  findClipCandidateById: findClipCandidateByIdMock,
  findClipCandidatesByMediaIdAndUserId: findClipCandidatesByMediaIdAndUserIdMock,
  findLatestTranscriptByMediaIdAndUserId: findLatestTranscriptByMediaIdAndUserIdMock,
  findTranscriptByIdAndMediaIdAndUserId: findTranscriptByIdAndMediaIdAndUserIdMock,
  findMediaById: findMediaByIdMock,
  findLatestShortClipVideoAsset: findLatestShortClipVideoAssetMock,
  findShortClipById: findShortClipByIdMock,
  findShortClipsByMediaIdAndUserId: findShortClipsByMediaIdAndUserIdMock,
  updateProcessingJob: updateProcessingJobMock
}))

jest.unstable_mockModule('./short-clips.queue', () => ({
  publishShortClipJob: publishShortClipJobMock
}))

jest.unstable_mockModule('../../infrastructure/s3/uploader', () => ({
  PRESIGNED_DOWNLOAD_EXPIRES_SECONDS: 900,
  createPresignedGetUrl: createPresignedGetUrlMock
}))

const shortClipsService = await import('./short-clips.service')

const mediaId = '00000000-0000-4000-8000-000000000001'
const userId = '00000000-0000-4000-8000-000000000002'
const otherUserId = '00000000-0000-4000-8000-000000000099'
const jobId = '00000000-0000-4000-8000-000000000003'
const transcriptId = '00000000-0000-4000-8000-000000000004'
const candidateId = '00000000-0000-4000-8000-000000000005'
const chapterId = '00000000-0000-4000-8000-000000000006'
const shortClipId = '00000000-0000-4000-8000-000000000007'
const assetId = '00000000-0000-4000-8000-000000000008'
const now = new Date('2026-05-24T10:00:00.000Z')

const defaultPreferences = {
  clipCount: 3,
  clipLength: 'AUTO' as const,
  aspectRatio: '9:16' as const,
  language: 'AUTO' as const,
  genre: 'AUTO' as const,
  clipModel: 'AUTO' as const,
  autoHook: true,
  prompt: '',
  captionPresetId: 'karaoke',
  burnSubtitle: true
}

const generateInput = () => ({
  mediaId,
  userId,
  preferences: defaultPreferences
})

const createMedia = (overrides: Partial<Media> = {}): Media => ({
  id: mediaId,
  userId,
  type: 'VIDEO',
  title: 'Video test',
  description: null,
  originalFilename: 'video.mp4',
  s3Bucket: 'vidpilot-media',
  s3Key: 'uploads/users/user/videos/video.mp4',
  s3Region: 'us-east-1',
  s3Etag: null,
  uploadId: null,
  duration: 120,
  fileSizeBytes: BigInt(1024),
  mimeType: 'video/mp4',
  width: 1920,
  height: 1080,
  status: 'UPLOADED',
  createdAt: now,
  updatedAt: now,
  ...overrides
})

const createTranscript = (overrides: Partial<Transcript> = {}): Transcript => ({
  id: transcriptId,
  mediaId,
  jobId,
  language: 'en',
  source: 'LOCAL',
  asrModel: 'FASTER_WHISPER',
  modelSize: 'LARGE_V3',
  fullText: 'Hello. This is a transcript.',
  wordCount: 5,
  isEdited: false,
  version: 2,
  fullTextUpdatedAt: now,
  createdAt: now,
  updatedAt: now,
  ...overrides
})

const createProcessingJob = (overrides: Partial<ProcessingJob> = {}): ProcessingJob => ({
  id: jobId,
  mediaId,
  userId,
  jobType: 'GENERATE_SHORT_CLIPS',
  status: 'PENDING',
  progress: 0,
  errorMessage: null,
  queueName: null,
  taskName: null,
  externalTaskId: null,
  attemptCount: 0,
  input: null,
  output: null,
  createdAt: now,
  updatedAt: now,
  startedAt: null,
  completedAt: null,
  ...overrides
})

const createCandidate = (overrides: Partial<ClipCandidate> = {}): ClipCandidate => ({
  id: candidateId,
  mediaId,
  userId,
  transcriptId,
  chapterId,
  jobId,
  projectId: null,
  startTime: 10,
  endTime: 45,
  duration: 35,
  transcriptVersion: 2,
  title: 'Strong short clip',
  reason: 'Useful segment.',
  score: 0.82,
  text: 'A good candidate.',
  metadata: { sourceSegmentIds: ['segment-1'] },
  status: 'CANDIDATE',
  createdAt: now,
  ...overrides
})

const createAsset = (overrides: Partial<GeneratedAsset> = {}): GeneratedAsset => ({
  id: assetId,
  userId,
  mediaId,
  projectId: null,
  transcriptId,
  chapterId,
  shortClipId,
  jobId,
  assetType: 'SHORT_CLIP_VIDEO',
  transcriptVersion: 2,
  s3Bucket: 'vidpilot-media',
  s3Key: 'clips/media/clip.mp4',
  s3Region: 'us-east-1',
  s3Etag: null,
  mimeType: 'video/mp4',
  fileSizeBytes: BigInt(2048),
  metadata: { aspectRatio: '9:16' },
  createdAt: now,
  ...overrides
})

const createShortClip = (
  overrides: Partial<ShortClip> & {
    candidate?: ClipCandidate | null
    generatedAssets?: GeneratedAsset[]
  } = {}
): ShortClip & { candidate: ClipCandidate | null; generatedAssets: GeneratedAsset[] } => ({
  id: shortClipId,
  mediaId,
  userId,
  candidateId,
  projectId: null,
  aspectRatio: '9:16',
  status: 'READY',
  createdAt: now,
  updatedAt: now,
  candidate: overrides.candidate === undefined ? createCandidate() : overrides.candidate,
  generatedAssets: overrides.generatedAssets ?? [createAsset()],
  ...overrides
})

describe('short clips service', () => {
  beforeEach(() => {
    findMediaByIdMock.mockReset()
    findLatestTranscriptByMediaIdAndUserIdMock.mockReset()
    findTranscriptByIdAndMediaIdAndUserIdMock.mockReset()
    countTranscriptSegmentsByTranscriptIdMock.mockReset()
    findActiveShortClipJobByMediaIdAndUserIdMock.mockReset()
    createProcessingJobMock.mockReset()
    updateProcessingJobMock.mockReset()
    findClipCandidatesByMediaIdAndUserIdMock.mockReset()
    findClipCandidateByIdMock.mockReset()
    findShortClipsByMediaIdAndUserIdMock.mockReset()
    findShortClipByIdMock.mockReset()
    findLatestShortClipVideoAssetMock.mockReset()
    publishShortClipJobMock.mockReset()
    createPresignedGetUrlMock.mockReset()
  })

  it('selects the newest transcript, creates a pending job, and publishes it', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findActiveShortClipJobByMediaIdAndUserIdMock.mockResolvedValue(null)
    findLatestTranscriptByMediaIdAndUserIdMock.mockResolvedValue(createTranscript())
    countTranscriptSegmentsByTranscriptIdMock.mockResolvedValue(3)
    createProcessingJobMock.mockResolvedValue(createProcessingJob())
    publishShortClipJobMock.mockResolvedValue()

    const result = await shortClipsService.generateShortClips(generateInput())

    expect(findLatestTranscriptByMediaIdAndUserIdMock).toHaveBeenCalledWith(mediaId, userId)
    expect(countTranscriptSegmentsByTranscriptIdMock).toHaveBeenCalledWith(transcriptId)
    expect(createProcessingJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaId,
        userId,
        jobType: 'GENERATE_SHORT_CLIPS',
        status: 'PENDING',
        input: {
          transcriptId,
          transcriptVersion: 2,
          clipCount: 3,
          clipLength: 'AUTO',
          minDuration: 20,
          maxDuration: 60,
          aspectRatio: '9:16',
          language: 'AUTO',
          genre: 'AUTO',
          clipModel: 'AUTO',
          autoHook: true,
          prompt: '',
          captionPresetId: 'karaoke',
          burnSubtitle: true
        }
      })
    )
    expect(publishShortClipJobMock).toHaveBeenCalledWith({
      jobId,
      mediaId,
      userId,
      transcriptId,
      transcriptVersion: 2,
      preferences: expect.objectContaining({
        transcriptId,
        transcriptVersion: 2,
        clipCount: 3,
        minDuration: 20,
        maxDuration: 60,
        aspectRatio: '9:16'
      })
    })
    expect(result).toMatchObject({
      wasCreated: true,
      job: {
        id: jobId,
        mediaId,
        jobType: 'GENERATE_SHORT_CLIPS',
        status: 'PENDING'
      }
    })
  })

  it('returns an active job without publishing a duplicate', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findActiveShortClipJobByMediaIdAndUserIdMock.mockResolvedValue(createProcessingJob({ status: 'QUEUED' }))

    const result = await shortClipsService.generateShortClips(generateInput())

    expect(findLatestTranscriptByMediaIdAndUserIdMock).not.toHaveBeenCalled()
    expect(countTranscriptSegmentsByTranscriptIdMock).not.toHaveBeenCalled()
    expect(createProcessingJobMock).not.toHaveBeenCalled()
    expect(publishShortClipJobMock).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      wasCreated: false,
      job: {
        id: jobId,
        status: 'QUEUED'
      }
    })
  })

  it('rejects media with no transcript', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findActiveShortClipJobByMediaIdAndUserIdMock.mockResolvedValue(null)
    findLatestTranscriptByMediaIdAndUserIdMock.mockResolvedValue(null)

    await expect(shortClipsService.generateShortClips(generateInput())).rejects.toMatchObject({
      statusCode: 409,
      code: 'SHORT_CLIPS_TRANSCRIPT_NOT_FOUND'
    })
    expect(createProcessingJobMock).not.toHaveBeenCalled()
  })

  it('rejects media with no transcript segments', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findActiveShortClipJobByMediaIdAndUserIdMock.mockResolvedValue(null)
    findLatestTranscriptByMediaIdAndUserIdMock.mockResolvedValue(createTranscript())
    countTranscriptSegmentsByTranscriptIdMock.mockResolvedValue(0)

    await expect(shortClipsService.generateShortClips(generateInput())).rejects.toMatchObject({
      statusCode: 409,
      code: 'SHORT_CLIPS_TRANSCRIPT_SEGMENTS_NOT_FOUND'
    })
    expect(createProcessingJobMock).not.toHaveBeenCalled()
  })

  it('rejects missing, forbidden, non-video, and not-uploaded media', async () => {
    findMediaByIdMock.mockResolvedValueOnce(null)
    await expect(shortClipsService.generateShortClips(generateInput())).rejects.toMatchObject({
      statusCode: 404,
      code: 'MEDIA_NOT_FOUND'
    })

    findMediaByIdMock.mockResolvedValueOnce(createMedia({ userId: otherUserId }))
    await expect(shortClipsService.generateShortClips(generateInput())).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })

    findMediaByIdMock.mockResolvedValueOnce(createMedia({ type: 'IMAGE', mimeType: 'image/png' }))
    await expect(shortClipsService.generateShortClips(generateInput())).rejects.toMatchObject({
      statusCode: 409,
      code: 'INVALID_MEDIA_STATE'
    })

    findMediaByIdMock.mockResolvedValueOnce(createMedia({ status: 'UPLOADING' }))
    await expect(shortClipsService.generateShortClips(generateInput())).rejects.toMatchObject({
      statusCode: 409,
      code: 'INVALID_MEDIA_STATE'
    })
  })

  it('marks the job failed if queue publish fails', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findActiveShortClipJobByMediaIdAndUserIdMock.mockResolvedValue(null)
    findLatestTranscriptByMediaIdAndUserIdMock.mockResolvedValue(createTranscript())
    countTranscriptSegmentsByTranscriptIdMock.mockResolvedValue(3)
    createProcessingJobMock.mockResolvedValue(createProcessingJob())
    updateProcessingJobMock.mockResolvedValue(createProcessingJob({ status: 'FAILED' }))
    publishShortClipJobMock.mockRejectedValue(new Error('RabbitMQ unavailable'))

    await expect(shortClipsService.generateShortClips(generateInput())).rejects.toMatchObject({
      statusCode: 502,
      code: 'SHORT_CLIPS_QUEUE_PUBLISH_FAILED'
    })
    expect(updateProcessingJobMock).toHaveBeenCalledWith(
      jobId,
      expect.objectContaining({
        status: 'FAILED',
        progress: 0,
        errorMessage: 'Failed to publish short clip generation job',
        completedAt: expect.any(Date)
      })
    )
  })

  it('returns paginated clip candidates for owned media', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findClipCandidatesByMediaIdAndUserIdMock.mockResolvedValue([[createCandidate()], 1])

    const result = await shortClipsService.listClipCandidates(userId, mediaId, {
      page: 2,
      limit: 5,
      status: 'CANDIDATE',
      transcriptId,
      chapterId,
      jobId,
      sortBy: 'createdAt',
      sortOrder: 'asc'
    })

    expect(findClipCandidatesByMediaIdAndUserIdMock).toHaveBeenCalledWith(
      {
        mediaId,
        userId,
        status: 'CANDIDATE',
        transcriptId,
        chapterId,
        jobId
      },
      5,
      5,
      'createdAt',
      'asc'
    )
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: candidateId,
          mediaId,
          transcriptId,
          score: 0.82
        })
      ],
      total: 1,
      page: 2,
      limit: 5,
      totalPages: 1
    })
  })

  it('returns a candidate detail when its media belongs to the user', async () => {
    findClipCandidateByIdMock.mockResolvedValue(createCandidate())
    findMediaByIdMock.mockResolvedValue(createMedia())

    const candidate = await shortClipsService.getClipCandidate(userId, candidateId)

    expect(candidate).toMatchObject({
      id: candidateId,
      mediaId,
      transcriptId,
      status: 'CANDIDATE'
    })
  })

  it('distinguishes missing and forbidden candidates', async () => {
    findClipCandidateByIdMock.mockResolvedValueOnce(null)
    await expect(shortClipsService.getClipCandidate(userId, candidateId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'CLIP_CANDIDATE_NOT_FOUND'
    })

    findClipCandidateByIdMock.mockResolvedValueOnce(createCandidate())
    findMediaByIdMock.mockResolvedValueOnce(createMedia({ userId: otherUserId }))
    await expect(shortClipsService.getClipCandidate(userId, candidateId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })
  })

  it('returns paginated short clips for owned media', async () => {
    findMediaByIdMock.mockResolvedValue(createMedia())
    findShortClipsByMediaIdAndUserIdMock.mockResolvedValue([[createShortClip()], 1])

    const result = await shortClipsService.listShortClips(userId, mediaId, {
      page: 2,
      limit: 5,
      status: 'READY',
      sortBy: 'updatedAt',
      sortOrder: 'asc'
    })

    expect(findShortClipsByMediaIdAndUserIdMock).toHaveBeenCalledWith(
      {
        mediaId,
        userId,
        status: 'READY'
      },
      5,
      5,
      'updatedAt',
      'asc'
    )
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: shortClipId,
          mediaId,
          userId,
          status: 'READY'
        })
      ],
      total: 1,
      page: 2,
      limit: 5,
      totalPages: 1
    })
  })

  it('rejects listing short clips for invalid media states and ownership', async () => {
    findMediaByIdMock.mockResolvedValueOnce(null)
    await expect(
      shortClipsService.listShortClips(userId, mediaId, {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'MEDIA_NOT_FOUND'
    })

    findMediaByIdMock.mockResolvedValueOnce(createMedia({ userId: otherUserId }))
    await expect(
      shortClipsService.listShortClips(userId, mediaId, {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })

    findMediaByIdMock.mockResolvedValueOnce(createMedia({ type: 'IMAGE', mimeType: 'image/png' }))
    await expect(
      shortClipsService.listShortClips(userId, mediaId, {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'INVALID_MEDIA_STATE'
    })

    findMediaByIdMock.mockResolvedValueOnce(createMedia({ status: 'DELETED' }))
    await expect(
      shortClipsService.listShortClips(userId, mediaId, {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'MEDIA_NOT_FOUND'
    })

    findMediaByIdMock.mockResolvedValueOnce(createMedia({ status: 'UPLOADING' }))
    await expect(
      shortClipsService.listShortClips(userId, mediaId, {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'INVALID_MEDIA_STATE'
    })
  })

  it('returns a short clip detail when it belongs to the user', async () => {
    findShortClipByIdMock.mockResolvedValue(createShortClip())

    const clip = await shortClipsService.getShortClip(userId, shortClipId)

    expect(clip).toMatchObject({
      id: shortClipId,
      mediaId,
      userId,
      status: 'READY'
    })
  })

  it('distinguishes missing and forbidden short clips', async () => {
    findShortClipByIdMock.mockResolvedValueOnce(null)
    await expect(shortClipsService.getShortClip(userId, shortClipId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'SHORT_CLIP_NOT_FOUND'
    })

    findShortClipByIdMock.mockResolvedValueOnce(createShortClip({ userId: otherUserId }))
    await expect(shortClipsService.getShortClip(userId, shortClipId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })
  })

  it('creates a download URL for ready short clips with a video asset', async () => {
    findShortClipByIdMock.mockResolvedValue(createShortClip())
    findLatestShortClipVideoAssetMock.mockResolvedValue(createAsset())
    createPresignedGetUrlMock.mockResolvedValue(
      'http://localhost:9000/vidpilot-media/clips/media/clip.mp4?signature=test'
    )

    const result = await shortClipsService.createShortClipDownloadUrl(userId, shortClipId)

    expect(createPresignedGetUrlMock).toHaveBeenCalledWith('vidpilot-media', 'clips/media/clip.mp4')
    expect(result).toEqual({
      url: 'http://localhost:9000/vidpilot-media/clips/media/clip.mp4?signature=test',
      expiresInSeconds: 900
    })
  })

  it('rejects short clip downloads when the clip is unavailable', async () => {
    findShortClipByIdMock.mockResolvedValueOnce(null)
    await expect(shortClipsService.createShortClipDownloadUrl(userId, shortClipId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'SHORT_CLIP_NOT_FOUND'
    })

    findShortClipByIdMock.mockResolvedValueOnce(createShortClip({ userId: otherUserId }))
    await expect(shortClipsService.createShortClipDownloadUrl(userId, shortClipId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })

    findShortClipByIdMock.mockResolvedValueOnce(createShortClip({ status: 'RENDERING' }))
    await expect(shortClipsService.createShortClipDownloadUrl(userId, shortClipId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'SHORT_CLIP_NOT_READY'
    })

    findShortClipByIdMock.mockResolvedValueOnce(createShortClip())
    findLatestShortClipVideoAssetMock.mockResolvedValueOnce(null)
    await expect(shortClipsService.createShortClipDownloadUrl(userId, shortClipId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'SHORT_CLIP_VIDEO_NOT_FOUND'
    })
  })

  it('wraps storage errors when creating a download URL', async () => {
    findShortClipByIdMock.mockResolvedValue(createShortClip())
    findLatestShortClipVideoAssetMock.mockResolvedValue(createAsset())
    createPresignedGetUrlMock.mockRejectedValue(new Error('S3 unavailable'))

    await expect(shortClipsService.createShortClipDownloadUrl(userId, shortClipId)).rejects.toMatchObject({
      statusCode: 502,
      code: 'SHORT_CLIP_STORAGE_FAILURE'
    })
  })
})
