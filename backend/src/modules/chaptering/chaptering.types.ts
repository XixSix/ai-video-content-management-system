import type { ChapterSource } from '../../infrastructure/db/generated/prisma/client'
import type { JobResponseData } from '../jobs/jobs.types'
import type { GenerateChaptersBody } from './chaptering.schema'

export const CHAPTERING_QUEUE_NAME = 'chaptering_queue'
export const CHAPTERING_TASK_NAME = 'generate_chapters'
export const CHAPTERING_CELERY_TASK_NAME = 'chaptering_task'

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
