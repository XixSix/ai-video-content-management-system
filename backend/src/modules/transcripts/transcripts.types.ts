import type { JobResponseData } from '../jobs/jobs.types'
import type { AsrModel, ModelSize, TranscriptSource } from '../../infrastructure/db/generated/prisma/client'
import type { ExportTranscriptBody, GenerateTranscriptBody, SaveTranscriptEditorDraftBody } from './transcripts.schema'

export const TRANSCRIBE_QUEUE_NAME = 'transcribe_queue'
export const TRANSCRIBE_TASK_NAME = 'transcribe'
export const TRANSCRIPT_EXPORT_TASK_NAME = 'export_transcript'
export const TRANSCRIPT_BURN_TASK_NAME = 'burn_transcript'
export const TRANSCRIBE_CELERY_TASK_NAME = 'transcribe_task'

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

export type SaveTranscriptEditorDraftInput = SaveTranscriptEditorDraftBody & {
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

export interface TranscriptWordData {
  id: string
  transcriptId: string
  segmentId: string
  mediaId: string
  wordIndex: number
  segmentWordIndex: number
  startTime: number
  endTime: number
  text: string
  cleanText: string | null
  confidence: number | null
  speakerLabel: string | null
  createdAt: Date
}

export interface TranscriptEditorTranscriptData {
  id: string
  mediaId: string
  version: number
  isEdited: boolean
  language: string | null
}

export interface TranscriptEditorBlockData {
  blockId: string
  startTime: number
  endTime: number
  text: string
  sourceSegmentIds: string[]
  sourceWordIds: string[]
}

export interface TranscriptEditorDraftData {
  id: string
  baseTranscriptVersion: number
  revision: number
  clientSequence: number
  blocks: TranscriptEditorBlockData[]
}

export interface TranscriptEditorData {
  transcript: TranscriptEditorTranscriptData
  segments: TranscriptSegmentData[]
  words: TranscriptWordData[]
  draft: TranscriptEditorDraftData | null
}
