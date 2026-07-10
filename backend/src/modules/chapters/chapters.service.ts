import type { Media } from '../../infrastructure/db/generated/prisma/client'
import { JobStatus, JobType, MediaStatus, MediaType } from '../../infrastructure/db/generated/prisma/client'
import { MediaError } from '../media/media.error'
import { GenerateChaptersError } from './chapters.error'
import { toChapterData, toJobResponseData } from './chapters.mapper'
import * as chaptersQueue from './chapters.queue'
import * as chaptersRepo from './chapters.repository'
import { GENERATE_CHAPTERS_QUEUE_NAME, GENERATE_CHAPTERS_TASK_NAME } from './chapters.types'
import type { ChapterData, GenerateChaptersInput, GenerateChaptersServiceResult } from './chapters.types'

export const generateChapters = async (input: GenerateChaptersInput): Promise<GenerateChaptersServiceResult> => {
  const media = await getOwnedMedia(input.userId, input.mediaId)

  if (media.status !== MediaStatus.UPLOADED) {
    throw MediaError.invalidState(`Cannot generate chapters for media in status ${media.status}`)
  }

  if (media.type !== MediaType.VIDEO) {
    throw MediaError.invalidState('Cannot generate chapters for non-video media')
  }

  const activeJob = await chaptersRepo.findActiveGenerateChaptersJobByMediaIdAndUserId(media.id, input.userId)

  if (activeJob) {
    return {
      job: toJobResponseData(activeJob),
      wasCreated: false
    }
  }

  const transcript = await chaptersRepo.findLatestTranscriptByMediaIdAndUserId(media.id, input.userId)

  if (!transcript) {
    throw GenerateChaptersError.noTranscript()
  }

  const job = await chaptersRepo.createProcessingJob({
    mediaId: media.id,
    userId: input.userId,
    jobType: JobType.GENERATE_CHAPTERS,
    status: JobStatus.PENDING,
    progress: 0,
    queueName: GENERATE_CHAPTERS_QUEUE_NAME,
    taskName: GENERATE_CHAPTERS_TASK_NAME,
    input: {
      transcriptId: transcript.id,
      transcriptVersion: transcript.version,
      minChapterDuration: input.minChapterDuration,
      targetChapterDuration: input.targetChapterDuration,
      maxChapters: input.maxChapters,
      useLlm: input.useLlm,
      useEmbeddings: input.useEmbeddings
    }
  })

  try {
    await chaptersQueue.publishGenerateChaptersJob({
      jobId: job.id,
      jobType: JobType.GENERATE_CHAPTERS
    })
  } catch {
    await chaptersRepo.updateProcessingJob(job.id, {
      status: JobStatus.FAILED,
      progress: 0,
      errorMessage: 'Failed to publish chapter generation job',
      completedAt: new Date()
    })

    throw GenerateChaptersError.queuePublishFailed()
  }

  return {
    job: toJobResponseData(job),
    wasCreated: true
  }
}

export const listMediaChapters = async (userId: string, mediaId: string): Promise<ChapterData[]> => {
  const media = await getOwnedMedia(userId, mediaId)

  if (media.status === MediaStatus.DELETED) {
    throw MediaError.notFound()
  }

  if (media.status !== MediaStatus.UPLOADED) {
    throw MediaError.invalidState(`Cannot list chapters for media in status ${media.status}`)
  }

  if (media.type !== 'VIDEO') {
    throw MediaError.invalidState('Cannot list chapters for non-video media')
  }

  const chapters = await chaptersRepo.findChaptersByMediaIdAndUserId(media.id, userId)

  return chapters.map(toChapterData)
}

const getOwnedMedia = async (userId: string, mediaId: string): Promise<Media> => {
  const media = await chaptersRepo.findMediaById(mediaId)

  if (!media) {
    throw MediaError.notFound()
  }

  if (media.userId !== userId) {
    throw MediaError.forbidden()
  }

  return media
}
