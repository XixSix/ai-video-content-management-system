import type { ProcessingJobData } from "@/features/jobs/job.types"

export type ClipCandidateStatus = "CANDIDATE" | "SELECTED" | "REJECTED"
export type ShortClipStatus = "PENDING" | "RENDERING" | "READY" | "FAILED" | "DELETED"

export type ClipCandidateData = {
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
  metadata: Record<string, unknown> | null
  status: ClipCandidateStatus
  createdAt: string
}

export type ShortClipAssetData = {
  id: string
  assetType: string
  transcriptVersion: number | null
  mimeType: string | null
  fileSizeBytes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export type ShortClipData = {
  id: string
  mediaId: string
  userId: string
  candidateId: string | null
  projectId: string | null
  aspectRatio: string | null
  status: ShortClipStatus
  candidate: ClipCandidateData | null
  assets: ShortClipAssetData[]
  createdAt: string
  updatedAt: string
}

export type GenerateShortClipsPreferences = {
  clipCount?: number
  clipLength?: "AUTO" | "15_30" | "30_60" | "60_90"
  minDuration?: number
  maxDuration?: number
  aspectRatio?: "9:16" | "1:1" | "16:9"
  language?: "AUTO" | "ENGLISH" | "VIETNAMESE"
  genre?: "AUTO" | "PODCAST" | "INTERVIEW" | "TUTORIAL" | "WEBINAR"
  clipModel?: "AUTO" | "BALANCED" | "VIRAL_HOOKS"
  autoHook?: boolean
  prompt?: string
  captionPresetId?: string
  burnSubtitle?: boolean
  transcriptId?: string
}

export type GenerateShortClipsResponse = {
  job: ProcessingJobData
}

export type ClipCandidateListQuery = {
  page?: number
  limit?: number
  status?: ClipCandidateStatus
  transcriptId?: string
  chapterId?: string
  jobId?: string
  sortBy?: "score" | "createdAt" | "startTime" | "duration"
  sortOrder?: "asc" | "desc"
}

export type ShortClipListQuery = {
  page?: number
  limit?: number
  status?: ShortClipStatus
  sortBy?: "createdAt" | "updatedAt" | "status"
  sortOrder?: "asc" | "desc"
}

export type PaginatedApiResponse<TItem> = {
  items: TItem[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
