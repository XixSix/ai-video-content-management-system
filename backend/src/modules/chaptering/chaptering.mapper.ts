import type { ProcessingJob, VideoChapter } from '../../infrastructure/db/generated/prisma/client'
import type { JobResponseData } from '../jobs/jobs.types'
import type { ChapterData } from './chaptering.types'

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

export const toChapterData = (chapter: VideoChapter): ChapterData => ({
  id: chapter.id,
  mediaId: chapter.mediaId,
  transcriptId: chapter.transcriptId,
  jobId: chapter.jobId,
  chapterIndex: chapter.chapterIndex,
  startTime: chapter.startTime,
  endTime: chapter.endTime,
  title: chapter.title,
  summary: chapter.summary,
  transcriptVersion: chapter.transcriptVersion,
  source: chapter.source,
  score: chapter.score,
  boundaryScore: chapter.boundaryScore,
  pauseScore: chapter.pauseScore,
  discourseMarkerScore: chapter.discourseMarkerScore,
  semanticShiftScore: chapter.semanticShiftScore,
  durationScore: chapter.durationScore,
  createdAt: chapter.createdAt,
  updatedAt: chapter.updatedAt
})
