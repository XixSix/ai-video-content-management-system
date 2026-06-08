import * as rabbitPublisher from '../../infrastructure/rabbitmq/publisher'
import { SHORT_CLIPS_CELERY_TASK_NAME, SHORT_CLIPS_QUEUE_NAME, SHORT_CLIPS_TASK_NAME } from './short-clips.types'

export interface ShortClipJobMessage {
  jobId: string
  mediaId: string
  userId: string
  transcriptId: string
  transcriptVersion: number
  taskName: typeof SHORT_CLIPS_TASK_NAME
}

export const publishShortClipJob = async (message: Omit<ShortClipJobMessage, 'taskName'>): Promise<void> => {
  await rabbitPublisher.publishCeleryTaskToQueue({
    queueName: SHORT_CLIPS_QUEUE_NAME,
    taskName: SHORT_CLIPS_CELERY_TASK_NAME,
    taskId: message.jobId,
    kwargs: {
      ...message,
      taskName: SHORT_CLIPS_TASK_NAME
    }
  })
}
