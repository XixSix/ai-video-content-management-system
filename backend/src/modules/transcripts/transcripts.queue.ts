import * as rabbitPublisher from '../../infrastructure/rabbitmq/publisher'
import { JobType } from '../../infrastructure/db/generated/prisma/client'
import { buildWorkerJobMessage, type WorkerJobMessage } from '../jobs/jobs.queue-message'
import {
  TRANSCRIBE_CELERY_TASK_NAME,
  TRANSCRIBE_TASK_NAME,
  TRANSCRIPT_BURN_TASK_NAME,
  TRANSCRIPT_EXPORT_TASK_NAME,
  TRANSCRIBE_QUEUE_NAME
} from './transcripts.types'

export type TranscriptJobMessage = WorkerJobMessage<typeof JobType.TRANSCRIBE, typeof TRANSCRIBE_TASK_NAME>

export type TranscriptExportJobMessage = WorkerJobMessage<
  typeof JobType.GENERATE_SUBTITLE,
  typeof TRANSCRIPT_EXPORT_TASK_NAME
>

export type TranscriptBurnJobMessage = WorkerJobMessage<typeof JobType.BURN_SUBTITLE, typeof TRANSCRIPT_BURN_TASK_NAME>

export const publishTranscriptJob = async (message: Pick<TranscriptJobMessage, 'jobId' | 'jobType'>): Promise<void> => {
  await rabbitPublisher.publishCeleryTaskToQueue({
    queueName: TRANSCRIBE_QUEUE_NAME,
    taskName: TRANSCRIBE_CELERY_TASK_NAME,
    taskId: message.jobId,
    kwargs: buildWorkerJobMessage({ ...message, taskName: TRANSCRIBE_TASK_NAME })
  })
}

export const publishTranscriptExportJob = async (
  message: Pick<TranscriptExportJobMessage, 'jobId' | 'jobType'>
): Promise<void> => {
  await rabbitPublisher.publishCeleryTaskToQueue({
    queueName: TRANSCRIBE_QUEUE_NAME,
    taskName: TRANSCRIBE_CELERY_TASK_NAME,
    taskId: message.jobId,
    kwargs: buildWorkerJobMessage({ ...message, taskName: TRANSCRIPT_EXPORT_TASK_NAME })
  })
}

export const publishTranscriptBurnJob = async (
  message: Pick<TranscriptBurnJobMessage, 'jobId' | 'jobType'>
): Promise<void> => {
  await rabbitPublisher.publishCeleryTaskToQueue({
    queueName: TRANSCRIBE_QUEUE_NAME,
    taskName: TRANSCRIBE_CELERY_TASK_NAME,
    taskId: message.jobId,
    kwargs: buildWorkerJobMessage({ ...message, taskName: TRANSCRIPT_BURN_TASK_NAME })
  })
}
