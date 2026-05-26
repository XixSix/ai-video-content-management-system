import type { Media } from '../../infrastructure/db/generated/prisma/client'
import { MediaError } from '../media/media.error'
import { TranscriptError } from './transcripts.error'
import {
  toJobResponseData,
  toTranscriptDetailData,
  toTranscriptSegmentData,
  toTranscriptSummaryData
} from './transcripts.mapper'
import * as transcriptQueue from './transcripts.queue'
import * as transcriptsRepo from './transcripts.repository'
import type {
  GenerateTranscriptInput,
  GenerateTranscriptResult,
  TranscriptDetailData,
  TranscriptSegmentData,
  TranscriptSummaryData
} from './transcripts.types'
import { TRANSCRIPT_QUEUE_NAME, TRANSCRIPT_TASK_NAME } from './transcripts.types'

export const generateTranscript = async (input: GenerateTranscriptInput): Promise<GenerateTranscriptResult> => {
  const media = await getOwnedMedia(input.userId, input.mediaId)

  if (media.status !== 'UPLOADED') {
    throw MediaError.invalidState(`Cannot generate transcript for media in status ${media.status}`)
  }

  if (media.type !== 'VIDEO') {
    throw MediaError.invalidState('Cannot generate transcript for non-video media')
  }

  const job = await transcriptsRepo.createProcessingJob({
    mediaId: media.id,
    userId: input.userId,
    jobType: 'TRANSCRIBE',
    status: 'PENDING',
    progress: 0,
    input: {
      language: input.language,
      generateSrt: input.generateSrt,
      generateVtt: input.generateVtt,
      burnTranscript: input.burnTranscript,
      useVad: input.useVad,
      sourceSeparation: input.sourceSeparation,
      useDiarization: input.useDiarization
    }
  })

  try {
    await transcriptQueue.publishTranscriptJob({
      jobId: job.id,
      mediaId: media.id,
      userId: input.userId,
      s3Key: media.s3Key
    })
  } catch {
    await transcriptsRepo.updateProcessingJob(job.id, {
      status: 'FAILED',
      progress: 0,
      errorMessage: 'Failed to publish transcript generation job',
      completedAt: new Date()
    })

    throw TranscriptError.queuePublishFailed()
  }

  const queuedJob = await transcriptsRepo.updateProcessingJob(job.id, {
    status: 'QUEUED',
    queueName: TRANSCRIPT_QUEUE_NAME,
    taskName: TRANSCRIPT_TASK_NAME,
    currentStep: 'Queued for transcription'
  })

  return {
    job: toJobResponseData(queuedJob)
  }
}

export const listMediaTranscripts = async (userId: string, mediaId: string): Promise<TranscriptSummaryData[]> => {
  const media = await getOwnedMedia(userId, mediaId)

  if (media.status === 'DELETED') {
    throw MediaError.notFound()
  }

  const transcripts = await transcriptsRepo.findTranscriptsByMediaIdAndUserId(media.id, userId)

  return transcripts.map(toTranscriptSummaryData)
}

export const getTranscript = async (userId: string, transcriptId: string): Promise<TranscriptDetailData> => {
  const transcript = await transcriptsRepo.findTranscriptByIdAndUserId(transcriptId, userId)

  if (!transcript) {
    throw TranscriptError.notFound()
  }

  return toTranscriptDetailData(transcript)
}

export const listTranscriptSegments = async (
  userId: string,
  transcriptId: string
): Promise<TranscriptSegmentData[]> => {
  const segments = await transcriptsRepo.findTranscriptSegmentsByTranscriptIdAndUserId(transcriptId, userId)

  if (!segments) {
    throw TranscriptError.notFound()
  }

  return segments.map(toTranscriptSegmentData)
}

const getOwnedMedia = async (userId: string, mediaId: string): Promise<Media> => {
  const media = await transcriptsRepo.findMediaById(mediaId)

  if (!media) {
    throw MediaError.notFound()
  }

  if (media.userId !== userId) {
    throw MediaError.forbidden()
  }

  return media
}
