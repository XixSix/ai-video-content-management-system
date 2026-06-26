import type { ProcessingJobData } from "@/features/jobs/job.types"

export type ClipCandidateStatus = "CANDIDATE" | "SELECTED" | "REJECTED"
export type ShortClipStatus = "PENDING" | "RENDERING" | "READY" | "FAILED" | "DELETED"

export type ClipCandidateData = {
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
  metadata: Record<string, unknown> | null
  status: ClipCandidateStatus
  createdAt: string
}

export type ShortClipData = {
  id: string
  mediaId: string
  userId: string
  transcriptId: string | null
  chapterId: string | null
  candidateId: string | null
  title: string | null
  caption: string | null
  description: string | null
  hashtags: unknown
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
  createdAt: string
  updatedAt: string
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
  sortBy?: "finalScore" | "createdAt" | "startTime" | "duration"
  sortOrder?: "asc" | "desc"
}

export type ShortClipListQuery = {
  page?: number
  limit?: number
  status?: ShortClipStatus
  sortBy?: "createdAt" | "startTime" | "duration" | "score"
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
