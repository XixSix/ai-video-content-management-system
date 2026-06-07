import type { ProcessingJob, Transcript, TranscriptSegment } from '../../infrastructure/db/generated/prisma/client'
import type { JobResponseData } from '../jobs/jobs.types'
import type { TranscriptDetailData, TranscriptSegmentData, TranscriptSummaryData } from './transcripts.types'

const FULL_TEXT_PREVIEW_MAX_LENGTH = 300

export const toJobResponseData = (job: ProcessingJob): JobResponseData => ({
  id: job.id,
  mediaId: job.mediaId,
  jobType: job.jobType,
  status: job.status,
  progress: job.progress,
  currentStep: job.currentStep,
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
  model: transcript.model,
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
  model: transcript.model,
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

const toFullTextPreview = (fullText: string | null): string | null => {
  if (!fullText) {
    return null
  }

  return fullText.length > FULL_TEXT_PREVIEW_MAX_LENGTH
    ? `${fullText.slice(0, FULL_TEXT_PREVIEW_MAX_LENGTH)}...`
    : fullText
}
