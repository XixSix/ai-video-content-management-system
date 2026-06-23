import * as rabbitPublisher from '../../infrastructure/rabbitmq/publisher'
import {
  EXPORT_RENDER_TASK_NAME,
  RENDER_EXPORTS_CELERY_TASK_NAME,
  RENDER_EXPORTS_QUEUE_NAME,
  type RenderExportJobMessage
} from './render-exports.types'

export const publishRenderExportJob = async (message: Omit<RenderExportJobMessage, 'taskName'>): Promise<void> => {
  await rabbitPublisher.publishCeleryTaskToQueue({
    queueName: RENDER_EXPORTS_QUEUE_NAME,
    taskName: RENDER_EXPORTS_CELERY_TASK_NAME,
    taskId: message.jobId,
    kwargs: {
      ...message,
      taskName: EXPORT_RENDER_TASK_NAME
    }
  })
}
