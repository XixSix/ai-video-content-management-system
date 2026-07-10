import type { ProcessingJob, VideoChapter } from '../../infrastructure/db/generated/prisma/client'
import type { JobResponseData } from '../jobs/jobs.types'
import type { ChapterData } from './chapters.types'

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

export const toChapterData = (chapter: VideoChapter): ChapterData => ({
  id: chapter.id,
  mediaId: chapter.mediaId,
  transcriptId: chapter.transcriptId,
  jobId: chapter.jobId,
  chapterIndex: chapter.chapterIndex,
  startTime: chapter.startTime,
  endTime: chapter.endTime,
  title: chapter.title,
  transcriptVersion: chapter.transcriptVersion,
  version: chapter.version,
  isEdited: chapter.isEdited,
  source: chapter.source,
  score: chapter.score,
  boundaryScore: chapter.boundaryScore,
  pauseScore: chapter.pauseScore,
  discourseMarkerScore: chapter.discourseMarkerScore,
  semanticShiftScore: chapter.semanticShiftScore,
  lexicalShiftScore: chapter.lexicalShiftScore,
  valleyDepthScore: chapter.valleyDepthScore,
  boundaryQualityScore: chapter.boundaryQualityScore,
  durationScore: chapter.durationScore,
  llmConfidenceScore: chapter.llmConfidenceScore,
  createdAt: chapter.createdAt,
  updatedAt: chapter.updatedAt
})
