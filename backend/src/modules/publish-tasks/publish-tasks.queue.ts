import * as rabbitPublisher from '../../infrastructure/rabbitmq/publisher'
import { JobType } from '../../infrastructure/db/generated/prisma/client'
import { buildWorkerJobMessage, type WorkerJobMessage } from '../jobs/jobs.queue-message'
import { PUBLISH_CELERY_TASK_NAME, PUBLISH_QUEUE_NAME, PUBLISH_TASK_NAME } from './publish-tasks.types'

export type PublishTaskJobMessage = WorkerJobMessage<typeof JobType.PUBLISH, typeof PUBLISH_TASK_NAME>

export const publishPublishTaskJob = async (
  message: Pick<PublishTaskJobMessage, 'jobId' | 'jobType'>,
  eta?: string
): Promise<void> => {
  await rabbitPublisher.publishCeleryTaskToQueue({
    queueName: PUBLISH_QUEUE_NAME,
    taskName: PUBLISH_CELERY_TASK_NAME,
    taskId: message.jobId,
    eta,
    kwargs: buildWorkerJobMessage({ ...message, taskName: PUBLISH_TASK_NAME })
  })
}
