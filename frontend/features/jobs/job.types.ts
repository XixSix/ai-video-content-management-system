export type ProcessingJobStatus =
  | "PENDING"
  | "QUEUED"
  | "RUNNING"
  | "TRANSCRIBING"
  | "GENERATING_SUBTITLE"
  | "BURNING_SUBTITLE"
  | "GENERATING_CHAPTERS"
  | "GENERATING_SHORT_CLIPS"
  | "GENERATING_SUGGESTIONS"
  | "GENERATING_MEDIA_PREVIEW"
  | "PUBLISHING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED"

export type ProcessingJobData = {
  id: string
  mediaId: string | null
  jobType: string
  status: ProcessingJobStatus
  progress: number
  errorMessage: string | null
  output: Record<string, unknown> | null
  attemptCount: number
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
}

export type ProcessingJobResponse = {
  job: ProcessingJobData
}

export type JobEventHandler = (job: ProcessingJobData) => void

export type JobSubscription = {
  close: () => void
}
