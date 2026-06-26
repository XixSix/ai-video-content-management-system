import * as rabbitPublisher from '../../infrastructure/rabbitmq/publisher'
import { PUBLISH_CELERY_TASK_NAME, PUBLISH_QUEUE_NAME, PUBLISH_TASK_NAME } from './publish-tasks.types'

export interface PublishTaskJobMessage {
  jobId: string
  publishTaskId: string
  mediaId: string | null
  projectId: string | null
  shortClipId: string | null
  exportAssetId: string | null
  userId: string
  platform: string
  platformAccountId: string
  scheduledAt: string | null
  taskName: typeof PUBLISH_TASK_NAME
}

export const publishPublishTaskJob = async (
  message: Omit<PublishTaskJobMessage, 'taskName'>,
  eta?: string
): Promise<void> => {
  await rabbitPublisher.publishCeleryTaskToQueue({
    queueName: PUBLISH_QUEUE_NAME,
    taskName: PUBLISH_CELERY_TASK_NAME,
    taskId: message.jobId,
    eta,
    kwargs: {
      ...message,
      taskName: PUBLISH_TASK_NAME
    }
  })
}
