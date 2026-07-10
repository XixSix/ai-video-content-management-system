import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const publishCeleryTaskToQueueMock = jest.fn<(input: unknown) => Promise<void>>()

jest.unstable_mockModule('../../infrastructure/rabbitmq/publisher', () => ({
  publishCeleryTaskToQueue: publishCeleryTaskToQueueMock
}))

const { publishMediaPreviewJob } = await import('./media-previews.queue')

describe('media previews queue', () => {
  beforeEach(() => {
    publishCeleryTaskToQueueMock.mockReset()
    publishCeleryTaskToQueueMock.mockResolvedValue()
  })

  it.each([
    ['GENERATE_THUMBNAIL', 'generate_thumbnail'],
    ['GENERATE_THUMBNAIL_SPRITE', 'generate_thumbnail_sprite'],
    ['GENERATE_WAVEFORM_PEAK', 'generate_waveform_peak']
  ] as const)('publishes %s with task name %s', async (jobType, taskName) => {
    await publishMediaPreviewJob({
      jobId: 'job-1',
      jobType
    })

    expect(publishCeleryTaskToQueueMock).toHaveBeenCalledWith({
      queueName: 'media_previews_queue',
      taskName: 'media_preview_task',
      taskId: 'job-1',
      kwargs: {
        version: 1,
        jobId: 'job-1',
        jobType,
        taskName
      }
    })
  })
})
