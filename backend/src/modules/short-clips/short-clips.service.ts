import type { Media } from '../../infrastructure/db/generated/prisma/client'
import { JobStatus, JobType, MediaStatus, MediaType } from '../../infrastructure/db/generated/prisma/client'
import { config } from '../../config'
import * as storageService from '../../infrastructure/s3/uploader'
import { MediaError } from '../media/media.error'
import { toClipCandidateData, toJobResponseData, toShortClipData } from './short-clips.mapper'
import * as shortClipsQueue from './short-clips.queue'
import * as shortClipsRepo from './short-clips.repository'
import type { GenerateShortClipsBody, ListClipCandidatesQuery, ListShortClipsQuery } from './short-clips.schema'
import { ShortClipsError } from './short-clips.error'
import type {
  ClipCandidateData,
  CreateShortClipDownloadUrlResult,
  GenerateShortClipsInput,
  GenerateShortClipsServiceResult,
  NormalizedShortClipJobInput,
  PaginatedResult,
  ShortClipData,
  ShortClipGenerationPreferences,
  ShortClipRecord
} from './short-clips.types'

export const generateShortClips = async (input: GenerateShortClipsInput): Promise<GenerateShortClipsServiceResult> => {
  const media = await getOwnedMedia(input.userId, input.mediaId)

  if (media.status !== MediaStatus.UPLOADED) {
    throw MediaError.invalidState(`Cannot generate short clips for media in status ${media.status}`)
  }

  if (media.type !== MediaType.VIDEO) {
    throw MediaError.invalidState('Cannot generate short clips for non-video media')
  }

  const activeJob = await shortClipsRepo.findActiveShortClipJobByMediaIdAndUserId(media.id, input.userId)

  if (activeJob) {
    return {
      job: toJobResponseData(activeJob),
      wasCreated: false
    }
  }

  const transcript = input.preferences.transcriptId
    ? await shortClipsRepo.findTranscriptByIdAndMediaIdAndUserId(input.preferences.transcriptId, media.id, input.userId)
    : await shortClipsRepo.findLatestTranscriptByMediaIdAndUserId(media.id, input.userId)

  if (!transcript) {
    throw ShortClipsError.noTranscript()
  }

  const segmentCount = await shortClipsRepo.countTranscriptSegmentsByTranscriptId(transcript.id)

  if (segmentCount === 0) {
    throw ShortClipsError.noTranscriptSegments()
  }

  const jobInput = normalizeShortClipJobInput(input.preferences, transcript.id, transcript.version)

  const job = await shortClipsRepo.createProcessingJob({
    mediaId: media.id,
    userId: input.userId,
    jobType: JobType.GENERATE_SHORT_CLIPS,
    status: JobStatus.PENDING,
    progress: 0,
    input: jobInput
  })

  try {
    await shortClipsQueue.publishShortClipJob({
      jobId: job.id,
      mediaId: media.id,
      userId: input.userId,
      transcriptId: transcript.id,
      transcriptVersion: transcript.version,
      preferences: jobInput
    })
  } catch {
    await shortClipsRepo.updateProcessingJob(job.id, {
      status: JobStatus.FAILED,
      progress: 0,
      errorMessage: 'Failed to publish short clip generation job',
      completedAt: new Date()
    })

    throw ShortClipsError.queuePublishFailed()
  }

  return {
    job: toJobResponseData(job),
    wasCreated: true
  }
}

export const listClipCandidates = async (
  userId: string,
  mediaId: string,
  query: ListClipCandidatesQuery
): Promise<PaginatedResult<ClipCandidateData>> => {
  const media = await getOwnedMedia(userId, mediaId)

  if (media.status === MediaStatus.DELETED) {
    throw MediaError.notFound()
  }

  if (media.status !== MediaStatus.UPLOADED) {
    throw MediaError.invalidState(`Cannot list clip candidates for media in status ${media.status}`)
  }

  if (media.type !== MediaType.VIDEO) {
    throw MediaError.invalidState('Cannot list clip candidates for non-video media')
  }

  const page = query.page
  const limit = query.limit
  const skip = (page - 1) * limit
  const [items, total] = await shortClipsRepo.findClipCandidatesByMediaIdAndUserId(
    {
      mediaId: media.id,
      userId,
      status: query.status,
      transcriptId: query.transcriptId,
      chapterId: query.chapterId,
      jobId: query.jobId
    },
    skip,
    limit,
    query.sortBy,
    query.sortOrder
  )

  return {
    items: items.map(toClipCandidateData),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
}

export const getClipCandidate = async (userId: string, candidateId: string): Promise<ClipCandidateData> => {
  const candidate = await shortClipsRepo.findClipCandidateById(candidateId)

  if (!candidate) {
    throw ShortClipsError.candidateNotFound()
  }

  const media = await shortClipsRepo.findMediaById(candidate.mediaId)

  if (!media) {
    throw ShortClipsError.candidateNotFound()
  }

  if (media.userId !== userId) {
    throw ShortClipsError.candidateForbidden()
  }

  return toClipCandidateData(candidate)
}

export const listShortClips = async (
  userId: string,
  mediaId: string,
  query: ListShortClipsQuery
): Promise<PaginatedResult<ShortClipData>> => {
  const media = await getOwnedMedia(userId, mediaId)

  if (media.status === MediaStatus.DELETED) {
    throw MediaError.notFound()
  }

  if (media.status !== MediaStatus.UPLOADED) {
    throw MediaError.invalidState(`Cannot list short clips for media in status ${media.status}`)
  }

  if (media.type !== MediaType.VIDEO) {
    throw MediaError.invalidState('Cannot list short clips for non-video media')
  }

  const page = query.page
  const limit = query.limit
  const skip = (page - 1) * limit
  const [items, total] = await shortClipsRepo.findShortClipsByMediaIdAndUserId(
    {
      mediaId: media.id,
      userId,
      status: query.status
    },
    skip,
    limit,
    query.sortBy,
    query.sortOrder
  )

  return {
    items: items.map(toShortClipData),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
}

export const getShortClip = async (userId: string, shortClipId: string): Promise<ShortClipData> => {
  const clip = await getOwnedShortClip(userId, shortClipId)

  return toShortClipData(clip)
}

export const createShortClipDownloadUrl = async (
  userId: string,
  shortClipId: string
): Promise<CreateShortClipDownloadUrlResult> => {
  const clip = await getOwnedShortClip(userId, shortClipId)

  if (clip.status !== 'READY') {
    throw ShortClipsError.shortClipNotReady()
  }

  const videoAsset = await shortClipsRepo.findLatestShortClipVideoAsset(clip.id, userId)

  if (!videoAsset) {
    throw ShortClipsError.shortClipVideoNotFound()
  }

  try {
    const url = await storageService.createPresignedGetUrl(videoAsset.s3Bucket ?? config.s3.bucket, videoAsset.s3Key)

    return {
      url,
      expiresInSeconds: storageService.PRESIGNED_DOWNLOAD_EXPIRES_SECONDS
    }
  } catch (error: unknown) {
    if (error instanceof ShortClipsError) {
      throw error
    }

    throw ShortClipsError.shortClipStorageFailure(error instanceof Error ? error.message : undefined)
  }
}

const getOwnedMedia = async (userId: string, mediaId: string): Promise<Media> => {
  const media = await shortClipsRepo.findMediaById(mediaId)

  if (!media) {
    throw MediaError.notFound()
  }

  if (media.userId !== userId) {
    throw MediaError.forbidden()
  }

  return media
}

const getOwnedShortClip = async (userId: string, shortClipId: string): Promise<ShortClipRecord> => {
  const clip = await shortClipsRepo.findShortClipById(shortClipId)

  if (!clip) {
    throw ShortClipsError.shortClipNotFound()
  }

  if (clip.userId !== userId) {
    throw ShortClipsError.shortClipForbidden()
  }

  return clip
}

const normalizeShortClipJobInput = (
  preferences: ShortClipGenerationPreferences | GenerateShortClipsBody,
  transcriptId: string,
  transcriptVersion: number
): NormalizedShortClipJobInput => {
  const durationDefaults = durationRangeForClipLength(preferences.clipLength)
  const minDuration = preferences.minDuration ?? durationDefaults.minDuration
  const maxDuration = preferences.maxDuration ?? durationDefaults.maxDuration
  const normalizedMinDuration = Math.min(minDuration, maxDuration)
  const normalizedMaxDuration = Math.max(minDuration, maxDuration)

  return {
    transcriptId,
    transcriptVersion,
    clipCount: preferences.clipCount,
    clipLength: preferences.clipLength,
    minDuration: normalizedMinDuration,
    maxDuration: normalizedMaxDuration,
    aspectRatio: preferences.aspectRatio,
    language: preferences.language,
    genre: preferences.genre,
    clipModel: preferences.clipModel,
    autoHook: preferences.autoHook,
    prompt: preferences.prompt,
    captionPresetId: preferences.captionPresetId,
    burnSubtitle: preferences.burnSubtitle
  }
}

const durationRangeForClipLength = (
  clipLength: ShortClipGenerationPreferences['clipLength']
): Pick<NormalizedShortClipJobInput, 'minDuration' | 'maxDuration'> => {
  if (clipLength === '15_30') {
    return { minDuration: 15, maxDuration: 30 }
  }

  if (clipLength === '30_60') {
    return { minDuration: 30, maxDuration: 60 }
  }

  if (clipLength === '60_90') {
    return { minDuration: 60, maxDuration: 90 }
  }

  return { minDuration: 20, maxDuration: 60 }
}
