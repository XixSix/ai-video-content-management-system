import { AssetType, JobStatus, JobType, MediaType, type Media } from '../../infrastructure/db/generated/prisma/client'
import * as mediaDerivativesQueue from './media-derivatives.queue'
import * as mediaDerivativesRepo from './media-derivatives.repository'
import type {
  DerivativeJobDraft,
  DerivativeJobRecord,
  MediaDerivativeDefinition,
  MediaDerivativeJobMessage
} from './media-derivatives.types'
import {
  GENERATE_THUMBNAIL_SPRITE_TASK_NAME,
  GENERATE_THUMBNAIL_TASK_NAME,
  GENERATE_WAVEFORM_PEAK_TASK_NAME,
  MEDIA_DERIVATIVES_QUEUE_NAME
} from './media-derivatives.types'

const MEDIA_DERIVATIVE_DEFINITIONS: readonly MediaDerivativeDefinition[] = [
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

const DERIVATIVE_DEFINITION_BY_JOB_TYPE: ReadonlyMap<JobType, MediaDerivativeDefinition> = new Map(
  MEDIA_DERIVATIVE_DEFINITIONS.map((definition) => [definition.jobType, definition] as const)
)
export const getEligibleDerivativeDefinitions = (mediaType: MediaType): MediaDerivativeDefinition[] =>
  MEDIA_DERIVATIVE_DEFINITIONS.filter((definition) => definition.supportedMediaTypes.includes(mediaType))

export const createDerivativeJobDrafts = (media: Media): DerivativeJobDraft[] =>
  getEligibleDerivativeDefinitions(media.type).map((definition) => ({
    kind: definition.kind,
    data: {
      mediaId: media.id,
      userId: media.userId,
      jobType: definition.jobType,
      status: JobStatus.PENDING,
      progress: 0,
      queueName: MEDIA_DERIVATIVES_QUEUE_NAME,
      taskName: definition.taskName,
      input: {
        mediaId: media.id,
        workspaceId: media.workspaceId,
        userId: media.userId,
        s3Bucket: media.s3Bucket,
        s3Key: media.s3Key,
        mediaType: media.type,
        mimeType: media.mimeType,
        derivativeKind: definition.kind
      }
    }
  }))

export const publishDerivativeJobs = async (media: Media, jobs: DerivativeJobRecord[]): Promise<void> => {
  const publishResults = await Promise.allSettled(
    jobs.map(async ({ job }) => {
      const definition = DERIVATIVE_DEFINITION_BY_JOB_TYPE.get(job.jobType)

      if (!definition) {
        throw new Error(`Unsupported media derivative job type: ${job.jobType}`)
      }

      const message: Omit<MediaDerivativeJobMessage, 'taskName'> = {
        jobId: job.id,
        jobType: definition.jobType,
        mediaId: media.id,
        workspaceId: media.workspaceId,
        userId: media.userId,
        s3Bucket: media.s3Bucket,
        s3Key: media.s3Key,
        mediaType: media.type,
        mimeType: media.mimeType
      }

      await mediaDerivativesQueue.publishMediaDerivativeJob(message)
    })
  )

  await Promise.all(
    publishResults.map(async (result, index) => {
      if (result.status === 'fulfilled') {
        return
      }

      const failedJob = jobs[index]
      const reason = result.reason instanceof Error ? result.reason.message : 'Unknown queue publish error'

      await mediaDerivativesRepo.updateProcessingJob(failedJob.job.id, {
        status: JobStatus.FAILED,
        progress: 0,
        errorMessage: `Failed to publish ${failedJob.kind} derivative job: ${reason}`,
        completedAt: new Date()
      })
    })
  )
}
