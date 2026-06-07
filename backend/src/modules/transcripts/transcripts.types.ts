import type { JobResponseData } from '../jobs/jobs.types'
import type { AsrModel, ModelSize, TranscriptSource } from '../../infrastructure/db/generated/prisma/client'
import type { ExportTranscriptBody, GenerateTranscriptBody } from './transcripts.schema'

export const TRANSCRIPT_QUEUE_NAME = 'transcript_queue'
export const TRANSCRIPT_TASK_NAME = 'transcribe'
export const TRANSCRIPT_EXPORT_TASK_NAME = 'export_transcript'
export const TRANSCRIPT_BURN_TASK_NAME = 'burn_transcript'
export const TRANSCRIPT_CELERY_TASK_NAME = 'transcript_task'

export type GenerateTranscriptInput = GenerateTranscriptBody & {
  mediaId: string
  userId: string
}

export type GenerateTranscriptResult = {
  job: JobResponseData
}

export type ExportTranscriptInput = ExportTranscriptBody & {
  transcriptId: string
  userId: string
}

export type BurnTranscriptInput = {
  transcriptId: string
  userId: string
}

export type TranscriptJobResult = {
  job: JobResponseData
}

export interface TranscriptSummaryData {
  id: string
  mediaId: string
  jobId: string | null
  language: string | null
  source: TranscriptSource
  asrModel: AsrModel | null
  modelSize: ModelSize | null
  fullTextPreview: string | null
  wordCount: number | null
  isEdited: boolean
  version: number
  fullTextUpdatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface TranscriptDetailData {
  id: string
  mediaId: string
  jobId: string | null
  language: string | null
  source: TranscriptSource
  asrModel: AsrModel | null
  modelSize: ModelSize | null
  fullText: string | null
  wordCount: number | null
  isEdited: boolean
  version: number
  fullTextUpdatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface TranscriptSegmentData {
  id: string
  transcriptId: string
  mediaId: string
  segmentIndex: number
  startTime: number
  endTime: number
  text: string
  cleanText: string | null
  confidence: number | null
  speakerLabel: string | null
  createdAt: Date
}
