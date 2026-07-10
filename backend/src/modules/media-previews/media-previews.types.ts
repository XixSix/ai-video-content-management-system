import type {
  AssetType,
  JobType,
  MediaType,
  Prisma,
  ProcessingJob
} from '../../infrastructure/db/generated/prisma/client'

export const MEDIA_PREVIEWS_QUEUE_NAME = 'media_previews_queue'
export const MEDIA_PREVIEWS_CELERY_TASK_NAME = 'media_preview_task'
export const GENERATE_THUMBNAIL_TASK_NAME = 'generate_thumbnail'
export const GENERATE_THUMBNAIL_SPRITE_TASK_NAME = 'generate_thumbnail_sprite'
export const GENERATE_WAVEFORM_PEAK_TASK_NAME = 'generate_waveform_peak'

export type MediaPreviewKind = 'thumbnail' | 'thumbnailSprite' | 'waveformPeak'
export type MediaPreviewTaskName =
  | typeof GENERATE_THUMBNAIL_TASK_NAME
  | typeof GENERATE_THUMBNAIL_SPRITE_TASK_NAME
  | typeof GENERATE_WAVEFORM_PEAK_TASK_NAME
export type MediaPreviewJobType = Extract<
  JobType,
  'GENERATE_THUMBNAIL' | 'GENERATE_THUMBNAIL_SPRITE' | 'GENERATE_WAVEFORM_PEAK'
>

export interface MediaPreviewDefinition {
  kind: MediaPreviewKind
  jobType: MediaPreviewJobType
  assetType: AssetType
  taskName: MediaPreviewTaskName
  supportedMediaTypes: readonly MediaType[]
}

export interface MediaPreviewJobMessage {
  version: 1
  jobId: string
  jobType: MediaPreviewJobType
  taskName: MediaPreviewTaskName
}

export interface PreviewJobDraft {
  kind: MediaPreviewKind
  data: Prisma.ProcessingJobUncheckedCreateInput
}

export interface PreviewJobRecord {
  kind: MediaPreviewKind
  job: ProcessingJob
}
