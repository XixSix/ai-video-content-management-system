import { AssetType, JobStatus, JobType, MediaType, type Media } from '../../infrastructure/db/generated/prisma/client'
import * as mediaPreviewsQueue from './media-previews.queue'
import * as mediaPreviewsRepo from './media-previews.repository'
import type {
  MediaPreviewDefinition,
  MediaPreviewJobMessage,
  PreviewJobDraft,
  PreviewJobRecord
} from './media-previews.types'
import {
  GENERATE_THUMBNAIL_SPRITE_TASK_NAME,
  GENERATE_THUMBNAIL_TASK_NAME,
  GENERATE_WAVEFORM_PEAK_TASK_NAME,
  MEDIA_PREVIEWS_QUEUE_NAME
} from './media-previews.types'

const MEDIA_PREVIEW_DEFINITIONS: readonly MediaPreviewDefinition[] = [
  {
    kind: 'thumbnail',
    jobType: JobType.GENERATE_THUMBNAIL,
    assetType: AssetType.THUMBNAIL,
    taskName: GENERATE_THUMBNAIL_TASK_NAME,
    supportedMediaTypes: [MediaType.VIDEO]
  },
  {
    kind: 'thumbnailSprite',
    jobType: JobType.GENERATE_THUMBNAIL_SPRITE,
    assetType: AssetType.THUMBNAIL_SPRITE,
    taskName: GENERATE_THUMBNAIL_SPRITE_TASK_NAME,
    supportedMediaTypes: [MediaType.VIDEO]
  },
  {
    kind: 'waveformPeak',
    jobType: JobType.GENERATE_WAVEFORM_PEAK,
    assetType: AssetType.WAVEFORM_PEAKS,
    taskName: GENERATE_WAVEFORM_PEAK_TASK_NAME,
    supportedMediaTypes: [MediaType.VIDEO, MediaType.AUDIO]
  }
] as const

const PREVIEW_DEFINITION_BY_JOB_TYPE: ReadonlyMap<JobType, MediaPreviewDefinition> = new Map(
  MEDIA_PREVIEW_DEFINITIONS.map((definition) => [definition.jobType, definition] as const)
)
export const getEligiblePreviewDefinitions = (mediaType: MediaType): MediaPreviewDefinition[] =>
  MEDIA_PREVIEW_DEFINITIONS.filter((definition) => definition.supportedMediaTypes.includes(mediaType))

export const createPreviewJobDrafts = (media: Media): PreviewJobDraft[] =>
  getEligiblePreviewDefinitions(media.type).map((definition) => ({
    kind: definition.kind,
    data: {
      mediaId: media.id,
      userId: media.userId,
      jobType: definition.jobType,
      status: JobStatus.PENDING,
      progress: 0,
      queueName: MEDIA_PREVIEWS_QUEUE_NAME,
      taskName: definition.taskName,
      input: {
        mediaId: media.id,
        workspaceId: media.workspaceId,
        userId: media.userId,
        s3Bucket: media.s3Bucket,
        s3Key: media.s3Key,
        mediaType: media.type,
        mimeType: media.mimeType,
        previewKind: definition.kind
      }
    }
  }))

export const publishPreviewJobs = async (media: Media, jobs: PreviewJobRecord[]): Promise<void> => {
  const publishResults = await Promise.allSettled(
    jobs.map(async ({ job }) => {
      const definition = PREVIEW_DEFINITION_BY_JOB_TYPE.get(job.jobType)

      if (!definition) {
        throw new Error(`Unsupported media preview job type: ${job.jobType}`)
      }

      const message: Pick<MediaPreviewJobMessage, 'jobId' | 'jobType'> = {
        jobId: job.id,
        jobType: definition.jobType
      }

      await mediaPreviewsQueue.publishMediaPreviewJob(message)
    })
  )

  await Promise.all(
    publishResults.map(async (result, index) => {
      if (result.status === 'fulfilled') {
        return
      }

      const failedJob = jobs[index]
      const reason = result.reason instanceof Error ? result.reason.message : 'Unknown queue publish error'

      await mediaPreviewsRepo.updateProcessingJob(failedJob.job.id, {
        status: JobStatus.FAILED,
        progress: 0,
        errorMessage: `Failed to publish ${failedJob.kind} preview job: ${reason}`,
        completedAt: new Date()
      })
    })
  )
}
