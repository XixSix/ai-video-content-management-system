import type { Media } from '../../infrastructure/db/generated/prisma/client'
import { JobStatus, JobType, MediaStatus, MediaType } from '../../infrastructure/db/generated/prisma/client'
import { MediaError } from '../media/media.error'
import { toClipCandidateData, toJobResponseData } from './short-clips.mapper'
import * as shortClipsQueue from './short-clips.queue'
import * as shortClipsRepo from './short-clips.repository'
import type { ListClipCandidatesQuery } from './short-clips.schema'
import { ShortClipsError } from './short-clips.error'
import type {
  ClipCandidateData,
  GenerateShortClipsInput,
  GenerateShortClipsServiceResult,
  PaginatedResult
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

  const transcript = await shortClipsRepo.findLatestTranscriptByMediaIdAndUserId(media.id, input.userId)

  if (!transcript) {
    throw ShortClipsError.noTranscript()
  }

  const segmentCount = await shortClipsRepo.countTranscriptSegmentsByTranscriptId(transcript.id)

  if (segmentCount === 0) {
    throw ShortClipsError.noTranscriptSegments()
  }

  const job = await shortClipsRepo.createProcessingJob({
    mediaId: media.id,
    userId: input.userId,
    jobType: JobType.GENERATE_SHORT_CLIPS,
    status: JobStatus.PENDING,
    progress: 0,
    input: {
      transcriptId: transcript.id,
      transcriptVersion: transcript.version
    }
  })

  try {
    await shortClipsQueue.publishShortClipJob({
      jobId: job.id,
      mediaId: media.id,
      userId: input.userId,
      transcriptId: transcript.id,
      transcriptVersion: transcript.version
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
