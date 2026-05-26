import type { JobResponseData } from '../jobs/jobs.types'
import type { GenerateTranscriptBody } from './transcripts.schema'

export const TRANSCRIPT_QUEUE_NAME = 'transcript_queue'
export const TRANSCRIPT_TASK_NAME = 'transcribe'
export const TRANSCRIPT_CELERY_TASK_NAME = 'transcript_task'

export type GenerateTranscriptInput = GenerateTranscriptBody & {
  mediaId: string
  userId: string
}

export type GenerateTranscriptResult = {
  job: JobResponseData
}

export interface TranscriptSummaryData {
  id: string
  mediaId: string
  jobId: string | null
  language: string | null
  source: string
  model: string | null
  fullTextPreview: string | null
  transcriptQualityScore: number | null
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
  source: string
  model: string | null
  fullText: string | null
  transcriptQualityScore: number | null
  fillerRatio: number | null
  uniqueWordRatio: number | null
  speechDensity: number | null
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
