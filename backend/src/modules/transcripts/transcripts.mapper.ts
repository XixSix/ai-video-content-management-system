import type {
  ProcessingJob,
  Transcript,
  TranscriptEditDraft,
  TranscriptSegment,
  TranscriptWord
} from '../../infrastructure/db/generated/prisma/client'
import type { JobResponseData } from '../jobs/jobs.types'
import type {
  TranscriptDetailData,
  TranscriptEditorBlockData,
  TranscriptEditorDraftData,
  TranscriptEditorTranscriptData,
  TranscriptSegmentData,
  TranscriptSummaryData,
  TranscriptWordData
} from './transcripts.types'

const FULL_TEXT_PREVIEW_MAX_LENGTH = 300

export const toJobResponseData = (job: ProcessingJob): JobResponseData => ({
  id: job.id,
  mediaId: job.mediaId,
  jobType: job.jobType,
  status: job.status,
  progress: job.progress,
  errorCode: job.errorCode,
  errorMessage: job.errorMessage,
  output: job.output,
  attemptCount: job.attemptCount,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  startedAt: job.startedAt,
  completedAt: job.completedAt
})

export const toTranscriptSummaryData = (transcript: Transcript): TranscriptSummaryData => ({
  id: transcript.id,
  mediaId: transcript.mediaId,
  jobId: transcript.jobId,
  language: transcript.language,
  source: transcript.source,
  asrModel: transcript.asrModel,
  modelSize: transcript.modelSize,
  fullTextPreview: toFullTextPreview(transcript.fullText),
  wordCount: transcript.wordCount,
  isEdited: transcript.isEdited,
  version: transcript.version,
  fullTextUpdatedAt: transcript.fullTextUpdatedAt,
  createdAt: transcript.createdAt,
  updatedAt: transcript.updatedAt
})

export const toTranscriptDetailData = (transcript: Transcript): TranscriptDetailData => ({
  id: transcript.id,
  mediaId: transcript.mediaId,
  jobId: transcript.jobId,
  language: transcript.language,
  source: transcript.source,
  asrModel: transcript.asrModel,
  modelSize: transcript.modelSize,
  fullText: transcript.fullText,
  wordCount: transcript.wordCount,
  isEdited: transcript.isEdited,
  version: transcript.version,
  fullTextUpdatedAt: transcript.fullTextUpdatedAt,
  createdAt: transcript.createdAt,
  updatedAt: transcript.updatedAt
})

export const toTranscriptSegmentData = (segment: TranscriptSegment): TranscriptSegmentData => ({
  id: segment.id,
  transcriptId: segment.transcriptId,
  mediaId: segment.mediaId,
  segmentIndex: segment.segmentIndex,
  startTime: segment.startTime,
  endTime: segment.endTime,
  text: segment.text,
  cleanText: segment.cleanText,
  confidence: segment.confidence,
  speakerLabel: segment.speakerLabel,
  createdAt: segment.createdAt
})

export const toTranscriptWordData = (word: TranscriptWord): TranscriptWordData => ({
  id: word.id,
  transcriptId: word.transcriptId,
  segmentId: word.segmentId,
  mediaId: word.mediaId,
  wordIndex: word.wordIndex,
  segmentWordIndex: word.segmentWordIndex,
  startTime: word.startTime,
  endTime: word.endTime,
  text: word.text,
  cleanText: word.cleanText,
  confidence: word.confidence,
  speakerLabel: word.speakerLabel,
  createdAt: word.createdAt
})

export const toTranscriptEditorTranscriptData = (transcript: Transcript): TranscriptEditorTranscriptData => ({
  id: transcript.id,
  mediaId: transcript.mediaId,
  version: transcript.version,
  isEdited: transcript.isEdited,
  language: transcript.language
})

export const toTranscriptEditorDraftData = (draft: TranscriptEditDraft): TranscriptEditorDraftData => ({
  id: draft.id,
  baseTranscriptVersion: draft.baseTranscriptVersion,
  revision: draft.revision,
  clientSequence: draft.clientSequence,
  blocks: toTranscriptEditorBlocks(draft.blocks)
})

const toFullTextPreview = (fullText: string | null): string | null => {
  if (!fullText) {
    return null
  }

  return fullText.length > FULL_TEXT_PREVIEW_MAX_LENGTH
    ? `${fullText.slice(0, FULL_TEXT_PREVIEW_MAX_LENGTH)}...`
    : fullText
}

const toTranscriptEditorBlocks = (blocks: unknown): TranscriptEditorBlockData[] =>
  Array.isArray(blocks) ? (blocks as TranscriptEditorBlockData[]) : []
