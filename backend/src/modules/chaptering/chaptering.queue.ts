import * as rabbitPublisher from '../../infrastructure/rabbitmq/publisher'
import { CHAPTERING_CELERY_TASK_NAME, CHAPTERING_QUEUE_NAME, CHAPTERING_TASK_NAME } from './chaptering.types'

export interface ChapteringJobMessage {
  jobId: string
  mediaId: string
  userId: string
  transcriptId: string
  transcriptVersion: number
  taskName: typeof CHAPTERING_TASK_NAME
}

export const publishChapteringJob = async (message: Omit<ChapteringJobMessage, 'taskName'>): Promise<void> => {
  await rabbitPublisher.publishCeleryTaskToQueue({
    queueName: CHAPTERING_QUEUE_NAME,
    taskName: CHAPTERING_CELERY_TASK_NAME,
    taskId: message.jobId,
    kwargs: {
      ...message,
      taskName: CHAPTERING_TASK_NAME
    }
  })
}
