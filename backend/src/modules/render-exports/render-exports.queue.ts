import * as rabbitPublisher from '../../infrastructure/rabbitmq/publisher'
import { buildWorkerJobMessage } from '../jobs/jobs.queue-message'
import {
  EXPORT_RENDER_TASK_NAME,
  RENDER_EXPORTS_CELERY_TASK_NAME,
  RENDER_EXPORTS_QUEUE_NAME,
  type RenderExportJobMessage
} from './render-exports.types'

export const publishRenderExportJob = async (
  message: Pick<RenderExportJobMessage, 'jobId' | 'jobType'>
): Promise<void> => {
  await rabbitPublisher.publishCeleryTaskToQueue({
    queueName: RENDER_EXPORTS_QUEUE_NAME,
    taskName: RENDER_EXPORTS_CELERY_TASK_NAME,
    taskId: message.jobId,
    kwargs: buildWorkerJobMessage({ ...message, taskName: EXPORT_RENDER_TASK_NAME })
  })
}
