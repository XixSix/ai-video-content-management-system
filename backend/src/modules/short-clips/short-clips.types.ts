import type {
  ClipCandidate,
  ClipCandidateStatus,
  GeneratedAsset,
  Prisma,
  ShortClip,
  ShortClipStatus
} from '../../infrastructure/db/generated/prisma/client'
import type { JobResponseData } from '../jobs/jobs.types'

export const GENERATE_SHORT_CLIPS_QUEUE_NAME = 'generate_short_clips_queue'
export const GENERATE_SHORT_CLIPS_TASK_NAME = 'generate_short_clips'
export const GENERATE_SHORT_CLIPS_CELERY_TASK_NAME = 'generate_short_clips_task'

export type GenerateShortClipsInput = {
  mediaId: string
  userId: string
  preferences: ShortClipGenerationPreferences
}

export type ShortClipGenerationPreferences = {
  transcriptId?: string
  clipCount: number
  clipLength: 'AUTO' | '15_30' | '30_60' | '60_90'
  minDuration?: number
  maxDuration?: number
  aspectRatio: '9:16' | '1:1' | '16:9'
  language: 'AUTO' | 'ENGLISH' | 'VIETNAMESE'
  genre: 'AUTO' | 'PODCAST' | 'INTERVIEW' | 'TUTORIAL' | 'WEBINAR'
  clipModel: 'AUTO' | 'BALANCED' | 'VIRAL_HOOKS'
  autoHook: boolean
  prompt: string
  captionPresetId: string
  burnSubtitle: boolean
}

export type GenerateShortClipsJobOptions = Omit<ShortClipGenerationPreferences, 'transcriptId'> & {
  transcriptId: string
  transcriptVersion: number
  minDuration: number
  maxDuration: number
}

export type GenerateShortClipsResult = {
  job: JobResponseData
}

export type GenerateShortClipsServiceResult = GenerateShortClipsResult & {
  wasCreated: boolean
}

export interface CreateShortClipDownloadUrlResult {
  url: string
  expiresInSeconds: number
}

export interface ClipCandidateData {
  id: string
  mediaId: string
  userId: string
  transcriptId: string
  chapterId: string | null
  jobId: string | null
  projectId: string | null
  startTime: number
  endTime: number
  duration: number
  transcriptVersion: number
  title: string | null
  reason: string | null
  score: number | null
  text: string | null
  metadata: Prisma.JsonValue | null
  status: ClipCandidateStatus
  createdAt: Date
}

export interface ShortClipAssetData {
  id: string
  assetType: string
  transcriptVersion: number | null
  mimeType: string | null
  fileSizeBytes: string | null
  metadata: Prisma.JsonValue | null
  createdAt: Date
}

export interface ShortClipData {
  id: string
  mediaId: string
  userId: string
  candidateId: string | null
  projectId: string | null
  aspectRatio: string | null
  status: ShortClipStatus
  candidate: ClipCandidateData | null
  assets: ShortClipAssetData[]
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

export type ClipCandidateRecord = ClipCandidate
export type ShortClipRecord = ShortClip & {
  candidate: ClipCandidate | null
  generatedAssets: GeneratedAsset[]
}

export type ClipCandidateSortField = 'score' | 'createdAt' | 'startTime' | 'duration'
export type ShortClipSortField = 'createdAt' | 'updatedAt' | 'status'
export type SortOrder = 'asc' | 'desc'
