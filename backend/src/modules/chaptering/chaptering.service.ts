import type { Media } from '../../infrastructure/db/generated/prisma/client'
import { JobStatus, JobType, MediaStatus, MediaType } from '../../infrastructure/db/generated/prisma/client'
import { MediaError } from '../media/media.error'
import { ChapteringError } from './chaptering.error'
import { toChapterData, toJobResponseData } from './chaptering.mapper'
import * as chapteringQueue from './chaptering.queue'
import * as chapteringRepo from './chaptering.repository'
import type { ChapterData, GenerateChaptersInput, GenerateChaptersServiceResult } from './chaptering.types'

export const generateChapters = async (input: GenerateChaptersInput): Promise<GenerateChaptersServiceResult> => {
  const media = await getOwnedMedia(input.userId, input.mediaId)

  if (media.status !== MediaStatus.UPLOADED) {
    throw MediaError.invalidState(`Cannot generate chapters for media in status ${media.status}`)
  }

  if (media.type !== MediaType.VIDEO) {
    throw MediaError.invalidState('Cannot generate chapters for non-video media')
  }

  const activeJob = await chapteringRepo.findActiveChapteringJobByMediaIdAndUserId(media.id, input.userId)

  if (activeJob) {
    return {
      job: toJobResponseData(activeJob),
      wasCreated: false
    }
  }

  const transcript = await chapteringRepo.findLatestTranscriptByMediaIdAndUserId(media.id, input.userId)

  if (!transcript) {
    throw ChapteringError.noTranscript()
  }

  const job = await chapteringRepo.createProcessingJob({
    mediaId: media.id,
    userId: input.userId,
    jobType: JobType.GENERATE_CHAPTERS,
    status: JobStatus.PENDING,
    progress: 0,
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
    await chapteringQueue.publishChapteringJob({
      jobId: job.id,
      mediaId: media.id,
      userId: input.userId,
      transcriptId: transcript.id,
      transcriptVersion: transcript.version
    })
  } catch {
    await chapteringRepo.updateProcessingJob(job.id, {
      status: JobStatus.FAILED,
      progress: 0,
      errorMessage: 'Failed to publish chapter generation job',
      completedAt: new Date()
    })

    throw ChapteringError.queuePublishFailed()
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

  const chapters = await chapteringRepo.findChaptersByMediaIdAndUserId(media.id, userId)

  return chapters.map(toChapterData)
}

const getOwnedMedia = async (userId: string, mediaId: string): Promise<Media> => {
  const media = await chapteringRepo.findMediaById(mediaId)

  if (!media) {
    throw MediaError.notFound()
  }

  if (media.userId !== userId) {
    throw MediaError.forbidden()
  }

  return media
}
