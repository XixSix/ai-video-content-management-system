import * as rabbitPublisher from '../../infrastructure/rabbitmq/publisher'
import {
  GENERATE_THUMBNAIL_SPRITE_TASK_NAME,
  GENERATE_THUMBNAIL_TASK_NAME,
  GENERATE_WAVEFORM_PEAK_TASK_NAME,
  MEDIA_PREVIEWS_CELERY_TASK_NAME,
  MEDIA_PREVIEWS_QUEUE_NAME,
  type MediaPreviewJobMessage,
  type MediaPreviewTaskName
} from './media-previews.types'

const getTaskName = (jobType: MediaPreviewJobMessage['jobType']): MediaPreviewTaskName => {
  switch (jobType) {
    case 'GENERATE_THUMBNAIL':
      return GENERATE_THUMBNAIL_TASK_NAME
    case 'GENERATE_THUMBNAIL_SPRITE':
      return GENERATE_THUMBNAIL_SPRITE_TASK_NAME
    case 'GENERATE_WAVEFORM_PEAK':
      return GENERATE_WAVEFORM_PEAK_TASK_NAME
  }
}

export const publishMediaPreviewJob = async (message: Omit<MediaPreviewJobMessage, 'taskName'>): Promise<void> => {
  await rabbitPublisher.publishCeleryTaskToQueue({
    queueName: MEDIA_PREVIEWS_QUEUE_NAME,
    taskName: MEDIA_PREVIEWS_CELERY_TASK_NAME,
    taskId: message.jobId,
    kwargs: {
      ...message,
      taskName: getTaskName(message.jobType)
    }
  })
}
