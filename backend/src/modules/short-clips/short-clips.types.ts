import type { ClipCandidateStatus, Prisma, ShortClipStatus } from '../../infrastructure/db/generated/prisma/client'
import type { JobResponseData } from '../jobs/jobs.types'

export const SHORT_CLIPS_QUEUE_NAME = 'short_clip_queue'
export const SHORT_CLIPS_TASK_NAME = 'generate_short_clips'
export const SHORT_CLIPS_CELERY_TASK_NAME = 'short_clip_task'

export type GenerateShortClipsInput = {
  mediaId: string
  userId: string
}

export type GenerateShortClipsResult = {
  job: JobResponseData
}

export type GenerateShortClipsServiceResult = GenerateShortClipsResult & {
  wasCreated: boolean
}

export interface ClipCandidateData {
  id: string
  mediaId: string
  transcriptId: string
  chapterId: string | null
  jobId: string | null
  startTime: number
  endTime: number
  duration: number
  transcriptVersion: number
  text: string | null
  cleanText: string | null
  hookScore: number | null
  questionScore: number | null
  keywordScore: number | null
  durationScore: number | null
  speechDensityScore: number | null
  saliencyScore: number | null
  completenessScore: number | null
  emotionScore: number | null
  finalScore: number | null
  llmScore: number | null
  llmReason: string | null
  dedupGroupId: string | null
  metadata: Prisma.JsonValue | null
  status: ClipCandidateStatus
  createdAt: Date
}

export interface ShortClipData {
  id: string
  mediaId: string
  userId: string
  transcriptId: string | null
  chapterId: string | null
  candidateId: string | null
  title: string | null
  caption: string | null
  description: string | null
  hashtags: Prisma.JsonValue | null
  startTime: number
  endTime: number
  duration: number
  transcriptVersion: number | null
  score: number | null
  reason: string | null
  videoPath: string | null
  thumbnailPath: string | null
  subtitlePath: string | null
  aspectRatio: string | null
  status: ShortClipStatus
  createdAt: Date
  updatedAt: Date
}

export interface PaginatedResult<TItem> {
  items: TItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type ClipCandidateSortField = 'finalScore' | 'createdAt' | 'startTime' | 'duration'
export type SortOrder = 'asc' | 'desc'
