import * as rabbitPublisher from '../../infrastructure/rabbitmq/publisher'
import {
  TRANSCRIPT_BURN_TASK_NAME,
  TRANSCRIPT_CELERY_TASK_NAME,
  TRANSCRIPT_EXPORT_TASK_NAME,
  TRANSCRIPT_QUEUE_NAME,
  TRANSCRIPT_TASK_NAME
} from './transcripts.types'

export interface TranscriptJobMessage {
  jobId: string
  mediaId: string
  userId: string
  s3Key: string
  taskName: typeof TRANSCRIPT_TASK_NAME
}

export interface TranscriptExportJobMessage {
  jobId: string
  mediaId: string
  userId: string
  transcriptId: string
  transcriptVersion: number
  format: 'json' | 'txt' | 'srt' | 'vtt'
  taskName: typeof TRANSCRIPT_EXPORT_TASK_NAME
}

export interface TranscriptBurnJobMessage {
  jobId: string
  mediaId: string
  userId: string
  transcriptId: string
  transcriptVersion: number
  taskName: typeof TRANSCRIPT_BURN_TASK_NAME
}

export const publishTranscriptJob = async (message: Omit<TranscriptJobMessage, 'taskName'>): Promise<void> => {
  await rabbitPublisher.publishCeleryTaskToQueue({
    queueName: TRANSCRIPT_QUEUE_NAME,
    taskName: TRANSCRIPT_CELERY_TASK_NAME,
    taskId: message.jobId,
    kwargs: {
      ...message,
      taskName: TRANSCRIPT_TASK_NAME
    }
  })
}

export const publishTranscriptExportJob = async (
  message: Omit<TranscriptExportJobMessage, 'taskName'>
): Promise<void> => {
  await rabbitPublisher.publishCeleryTaskToQueue({
    queueName: TRANSCRIPT_QUEUE_NAME,
    taskName: TRANSCRIPT_CELERY_TASK_NAME,
    taskId: message.jobId,
    kwargs: {
      ...message,
      taskName: TRANSCRIPT_EXPORT_TASK_NAME
    }
  })
}

export const publishTranscriptBurnJob = async (message: Omit<TranscriptBurnJobMessage, 'taskName'>): Promise<void> => {
  await rabbitPublisher.publishCeleryTaskToQueue({
    queueName: TRANSCRIPT_QUEUE_NAME,
    taskName: TRANSCRIPT_CELERY_TASK_NAME,
    taskId: message.jobId,
    kwargs: {
      ...message,
      taskName: TRANSCRIPT_BURN_TASK_NAME
    }
  })
}
