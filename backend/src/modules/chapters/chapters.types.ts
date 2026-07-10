import type { ChapterSource } from '../../infrastructure/db/generated/prisma/client'
import type { JobResponseData } from '../jobs/jobs.types'
import type { GenerateChaptersBody } from './chapters.schema'

export const GENERATE_CHAPTERS_QUEUE_NAME = 'generate_chapters_queue'
export const GENERATE_CHAPTERS_TASK_NAME = 'generate_chapters'
export const GENERATE_CHAPTERS_CELERY_TASK_NAME = 'generate_chapters_task'

export type GenerateChaptersInput = GenerateChaptersBody & {
  mediaId: string
  userId: string
}

export type GenerateChaptersResult = {
  job: JobResponseData
}

export type GenerateChaptersServiceResult = GenerateChaptersResult & {
  wasCreated: boolean
}

export interface ChapterData {
  id: string
  mediaId: string
  transcriptId: string
  jobId: string | null
  chapterIndex: number
  startTime: number
  endTime: number
  title: string
  transcriptVersion: number
  version: number
  isEdited: boolean
  source: ChapterSource
  score: number | null
  boundaryScore: number | null
  pauseScore: number | null
  discourseMarkerScore: number | null
  semanticShiftScore: number | null
  lexicalShiftScore: number | null
  valleyDepthScore: number | null
  boundaryQualityScore: number | null
  durationScore: number | null
  llmConfidenceScore: number | null
  createdAt: Date
  updatedAt: Date
}
