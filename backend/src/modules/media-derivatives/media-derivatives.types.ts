import type {
  AssetType,
  JobType,
  MediaType,
  Prisma,
  ProcessingJob
} from '../../infrastructure/db/generated/prisma/client'

export const MEDIA_DERIVATIVES_QUEUE_NAME = 'media_derivatives_queue'
export const MEDIA_DERIVATIVES_CELERY_TASK_NAME = 'media_derivative_task'
export const GENERATE_THUMBNAIL_TASK_NAME = 'generate_thumbnail'
export const GENERATE_THUMBNAIL_SPRITE_TASK_NAME = 'generate_thumbnail_sprite'
export const GENERATE_WAVEFORM_PEAK_TASK_NAME = 'generate_waveform_peak'

export type MediaDerivativeKind = 'thumbnail' | 'thumbnailSprite' | 'waveformPeak'
export type MediaDerivativeTaskName =
  | typeof GENERATE_THUMBNAIL_TASK_NAME
  | typeof GENERATE_THUMBNAIL_SPRITE_TASK_NAME
  | typeof GENERATE_WAVEFORM_PEAK_TASK_NAME
export type MediaDerivativeJobType = Extract<
  JobType,
  'GENERATE_THUMBNAIL' | 'GENERATE_THUMBNAIL_SPRITE' | 'GENERATE_WAVEFORM_PEAK'
>

export interface MediaDerivativeDefinition {
  kind: MediaDerivativeKind
  jobType: MediaDerivativeJobType
  assetType: AssetType
  taskName: MediaDerivativeTaskName
  supportedMediaTypes: readonly MediaType[]
}

export interface MediaDerivativeJobMessage {
  jobId: string
  jobType: MediaDerivativeJobType
  mediaId: string
  workspaceId: string
  userId: string
  s3Bucket: string
  s3Key: string
  mediaType: MediaType
  mimeType: string | null
  taskName: MediaDerivativeTaskName
}

export interface DerivativeJobDraft {
  kind: MediaDerivativeKind
  data: Prisma.ProcessingJobUncheckedCreateInput
}

export interface DerivativeJobRecord {
  kind: MediaDerivativeKind
  job: ProcessingJob
}
