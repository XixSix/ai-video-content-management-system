import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const publishCeleryTaskToQueueMock = jest.fn<(input: unknown) => Promise<void>>()

jest.unstable_mockModule('../../infrastructure/rabbitmq/publisher', () => ({
  publishCeleryTaskToQueue: publishCeleryTaskToQueueMock
}))

const { publishMediaDerivativeJob } = await import('./media-derivatives.queue')

describe('media derivatives queue', () => {
  beforeEach(() => {
    publishCeleryTaskToQueueMock.mockReset()
    publishCeleryTaskToQueueMock.mockResolvedValue()
  })

  it.each([
    ['GENERATE_THUMBNAIL', 'generate_thumbnail'],
    ['GENERATE_THUMBNAIL_SPRITE', 'generate_thumbnail_sprite'],
    ['GENERATE_WAVEFORM_PEAK', 'generate_waveform_peak']
  ] as const)('publishes %s with task name %s', async (jobType, taskName) => {
    await publishMediaDerivativeJob({
      jobId: 'job-1',
      jobType,
      mediaId: 'media-1',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      s3Bucket: 'vidpilot-media',
      s3Key: 'uploads/example.mp4',
      mediaType: 'VIDEO',
      mimeType: 'video/mp4'
    })

    expect(publishCeleryTaskToQueueMock).toHaveBeenCalledWith({
      queueName: 'media_derivatives_queue',
      taskName: 'media_derivative_task',
      taskId: 'job-1',
      kwargs: {
        jobId: 'job-1',
        jobType,
        mediaId: 'media-1',
        workspaceId: 'workspace-1',
        userId: 'user-1',
        s3Bucket: 'vidpilot-media',
        s3Key: 'uploads/example.mp4',
        mediaType: 'VIDEO',
        mimeType: 'video/mp4',
        taskName
      }
    })
  })
})
