import * as rabbitPublisher from '../../infrastructure/rabbitmq/publisher'
import {
  GENERATE_THUMBNAIL_SPRITE_TASK_NAME,
  GENERATE_THUMBNAIL_TASK_NAME,
  GENERATE_WAVEFORM_PEAK_TASK_NAME,
  MEDIA_DERIVATIVES_CELERY_TASK_NAME,
  MEDIA_DERIVATIVES_QUEUE_NAME,
  type MediaDerivativeJobMessage,
  type MediaDerivativeTaskName
} from './media-derivatives.types'

const getTaskName = (jobType: MediaDerivativeJobMessage['jobType']): MediaDerivativeTaskName => {
  switch (jobType) {
    case 'GENERATE_THUMBNAIL':
      return GENERATE_THUMBNAIL_TASK_NAME
    case 'GENERATE_THUMBNAIL_SPRITE':
      return GENERATE_THUMBNAIL_SPRITE_TASK_NAME
    case 'GENERATE_WAVEFORM_PEAK':
      return GENERATE_WAVEFORM_PEAK_TASK_NAME
  }
}

export const publishMediaDerivativeJob = async (
  message: Omit<MediaDerivativeJobMessage, 'taskName'>
): Promise<void> => {
  await rabbitPublisher.publishCeleryTaskToQueue({
    queueName: MEDIA_DERIVATIVES_QUEUE_NAME,
    taskName: MEDIA_DERIVATIVES_CELERY_TASK_NAME,
    taskId: message.jobId,
    kwargs: {
      ...message,
      taskName: getTaskName(message.jobType)
    }
  })
}
