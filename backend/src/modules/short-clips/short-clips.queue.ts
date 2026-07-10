import * as rabbitPublisher from '../../infrastructure/rabbitmq/publisher'
import { JobType } from '../../infrastructure/db/generated/prisma/client'
import { buildWorkerJobMessage, type WorkerJobMessage } from '../jobs/jobs.queue-message'
import {
  GENERATE_SHORT_CLIPS_CELERY_TASK_NAME,
  GENERATE_SHORT_CLIPS_QUEUE_NAME,
  GENERATE_SHORT_CLIPS_TASK_NAME
} from './short-clips.types'

export type GenerateShortClipsJobMessage = WorkerJobMessage<
  typeof JobType.GENERATE_SHORT_CLIPS,
  typeof GENERATE_SHORT_CLIPS_TASK_NAME
>

export const publishGenerateShortClipsJob = async (
  message: Pick<GenerateShortClipsJobMessage, 'jobId' | 'jobType'>
): Promise<void> => {
  await rabbitPublisher.publishCeleryTaskToQueue({
    queueName: GENERATE_SHORT_CLIPS_QUEUE_NAME,
    taskName: GENERATE_SHORT_CLIPS_CELERY_TASK_NAME,
    taskId: message.jobId,
    kwargs: buildWorkerJobMessage({ ...message, taskName: GENERATE_SHORT_CLIPS_TASK_NAME })
  })
}
