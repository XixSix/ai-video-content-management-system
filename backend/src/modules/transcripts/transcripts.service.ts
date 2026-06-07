import type { Media, Prisma } from '../../infrastructure/db/generated/prisma/client'
import { JobStatus, JobType } from '../../infrastructure/db/generated/prisma/client'
import { MediaStatus, MediaType } from '../../infrastructure/db/generated/prisma/client'
import { MediaError } from '../media/media.error'
import { TranscriptError } from './transcripts.error'
import {
  toJobResponseData,
  toTranscriptDetailData,
  toTranscriptEditorDraftData,
  toTranscriptEditorTranscriptData,
  toTranscriptSegmentData,
  toTranscriptSummaryData,
  toTranscriptWordData
} from './transcripts.mapper'
import * as transcriptQueue from './transcripts.queue'
import * as transcriptsRepo from './transcripts.repository'
import type {
  BurnTranscriptInput,
  ExportTranscriptInput,
  GenerateTranscriptInput,
  GenerateTranscriptResult,
  SaveTranscriptEditorDraftInput,
  TranscriptDetailData,
  TranscriptEditorData,
  TranscriptEditorDraftData,
  TranscriptJobResult,
  TranscriptSegmentData,
  TranscriptSummaryData
} from './transcripts.types'

export const generateTranscript = async (input: GenerateTranscriptInput): Promise<GenerateTranscriptResult> => {
  const media = await getOwnedMedia(input.userId, input.mediaId)

  if (media.status !== MediaStatus.UPLOADED) {
    throw MediaError.invalidState(`Cannot generate transcript for media in status ${media.status}`)
  }

  if (media.type !== MediaType.VIDEO) {
    throw MediaError.invalidState('Cannot generate transcript for non-video media')
  }

  const activeJob = await transcriptsRepo.findActiveTranscriptJobByMediaIdAndUserId(media.id, input.userId)

  if (activeJob) {
    return {
      job: toJobResponseData(activeJob)
    }
  }

  const job = await transcriptsRepo.createProcessingJob({
    mediaId: media.id,
    userId: input.userId,
    jobType: JobType.TRANSCRIBE,
    status: JobStatus.PENDING,
    progress: 0,
    input: {
      language: input.language,
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
      status: JobStatus.FAILED,
      progress: 0,
      errorMessage: 'Failed to publish transcript generation job',
      completedAt: new Date()
    })

    throw TranscriptError.queuePublishFailed()
  }

  return {
    job: toJobResponseData(job)
  }
}

export const listMediaTranscripts = async (userId: string, mediaId: string): Promise<TranscriptSummaryData[]> => {
  const media = await getOwnedMedia(userId, mediaId)

  if (media.status === MediaStatus.DELETED) {
    throw MediaError.notFound()
  }

  if (media.status !== MediaStatus.UPLOADED) {
    throw MediaError.invalidState(`Cannot list transcripts for media in status ${media.status}`)
  }

  if (media.type !== 'VIDEO') {
    throw MediaError.invalidState('Cannot list transcripts for non-video media')
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

export const getTranscriptEditor = async (userId: string, transcriptId: string): Promise<TranscriptEditorData> => {
  const transcript = await transcriptsRepo.findTranscriptByIdAndUserId(transcriptId, userId)

  if (!transcript) {
    throw TranscriptError.notFound()
  }

  const [segments, words, draft] = await Promise.all([
    transcriptsRepo.findTranscriptSegmentsByTranscriptId(transcript.id),
    transcriptsRepo.findTranscriptWordsByTranscriptId(transcript.id),
    transcriptsRepo.findActiveTranscriptEditDraftByTranscriptId(transcript.id)
  ])

  if (segments.length === 0) {
    throw TranscriptError.notFound('Transcript segments not found')
  }

  return {
    transcript: toTranscriptEditorTranscriptData(transcript),
    segments: segments.map(toTranscriptSegmentData),
    words: words.map(toTranscriptWordData),
    draft: draft ? toTranscriptEditorDraftData(draft) : null
  }
}

export const saveTranscriptEditorDraft = async (
  input: SaveTranscriptEditorDraftInput
): Promise<TranscriptEditorDraftData> => {
  const transcript = await transcriptsRepo.findTranscriptByIdAndUserId(input.transcriptId, input.userId)

  if (!transcript) {
    throw TranscriptError.notFound()
  }

  if (input.baseTranscriptVersion !== transcript.version) {
    throw TranscriptError.versionConflict(transcript.version, input.baseTranscriptVersion)
  }

  const existingDraft = await transcriptsRepo.findTranscriptEditDraftByTranscriptId(input.transcriptId)

  if (existingDraft && input.clientSequence <= existingDraft.clientSequence) {
    return toTranscriptEditorDraftData(existingDraft)
  }

  const blocks = input.blocks as unknown as Prisma.InputJsonValue

  const draft = await transcriptsRepo.upsertTranscriptEditDraft({
    transcriptId: transcript.id,
    userId: input.userId,
    baseTranscriptVersion: input.baseTranscriptVersion,
    clientSequence: input.clientSequence,
    blocks
  })

  return toTranscriptEditorDraftData(draft)
}

export const discardTranscriptEditorDraft = async (userId: string, transcriptId: string): Promise<boolean> => {
  const transcript = await transcriptsRepo.findTranscriptByIdAndUserId(transcriptId, userId)

  if (!transcript) {
    throw TranscriptError.notFound()
  }

  await transcriptsRepo.discardActiveTranscriptEditDraft(transcript.id)

  return true
}

export const exportTranscript = async (input: ExportTranscriptInput): Promise<TranscriptJobResult> => {
  const transcript = await transcriptsRepo.findTranscriptByIdAndUserId(input.transcriptId, input.userId)

  if (!transcript) {
    throw TranscriptError.notFound()
  }

  const job = await transcriptsRepo.createProcessingJob({
    mediaId: transcript.mediaId,
    userId: input.userId,
    jobType: JobType.GENERATE_SUBTITLE,
    status: JobStatus.PENDING,
    progress: 0,
    input: {
      transcriptId: transcript.id,
      transcriptVersion: transcript.version,
      format: input.format
    }
  })

  try {
    await transcriptQueue.publishTranscriptExportJob({
      jobId: job.id,
      mediaId: transcript.mediaId,
      userId: input.userId,
      transcriptId: transcript.id,
      transcriptVersion: transcript.version,
      format: input.format
    })
  } catch {
    await transcriptsRepo.updateProcessingJob(job.id, {
      status: JobStatus.FAILED,
      progress: 0,
      errorMessage: 'Failed to publish transcript export job',
      completedAt: new Date()
    })

    throw TranscriptError.queuePublishFailed('Failed to publish transcript export job')
  }

  return {
    job: toJobResponseData(job)
  }
}

export const burnTranscript = async (input: BurnTranscriptInput): Promise<TranscriptJobResult> => {
  const transcript = await transcriptsRepo.findTranscriptByIdAndUserId(input.transcriptId, input.userId)

  if (!transcript) {
    throw TranscriptError.notFound()
  }

  const job = await transcriptsRepo.createProcessingJob({
    mediaId: transcript.mediaId,
    userId: input.userId,
    jobType: JobType.BURN_SUBTITLE,
    status: JobStatus.PENDING,
    progress: 0,
    input: {
      transcriptId: transcript.id,
      transcriptVersion: transcript.version
    }
  })

  try {
    await transcriptQueue.publishTranscriptBurnJob({
      jobId: job.id,
      mediaId: transcript.mediaId,
      userId: input.userId,
      transcriptId: transcript.id,
      transcriptVersion: transcript.version
    })
  } catch {
    await transcriptsRepo.updateProcessingJob(job.id, {
      status: JobStatus.FAILED,
      progress: 0,
      errorMessage: 'Failed to publish transcript burn job',
      completedAt: new Date()
    })

    throw TranscriptError.queuePublishFailed('Failed to publish transcript burn job')
  }

  return {
    job: toJobResponseData(job)
  }
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
