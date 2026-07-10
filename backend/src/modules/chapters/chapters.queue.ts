import * as rabbitPublisher from '../../infrastructure/rabbitmq/publisher'
import { JobType } from '../../infrastructure/db/generated/prisma/client'
import { buildWorkerJobMessage, type WorkerJobMessage } from '../jobs/jobs.queue-message'
import {
  GENERATE_CHAPTERS_CELERY_TASK_NAME,
  GENERATE_CHAPTERS_QUEUE_NAME,
  GENERATE_CHAPTERS_TASK_NAME
} from './chapters.types'

export type GenerateChaptersJobMessage = WorkerJobMessage<
  typeof JobType.GENERATE_CHAPTERS,
  typeof GENERATE_CHAPTERS_TASK_NAME
>

export const publishGenerateChaptersJob = async (
  message: Pick<GenerateChaptersJobMessage, 'jobId' | 'jobType'>
): Promise<void> => {
  await rabbitPublisher.publishCeleryTaskToQueue({
    queueName: GENERATE_CHAPTERS_QUEUE_NAME,
    taskName: GENERATE_CHAPTERS_CELERY_TASK_NAME,
    taskId: message.jobId,
    kwargs: buildWorkerJobMessage({ ...message, taskName: GENERATE_CHAPTERS_TASK_NAME })
  })
}
