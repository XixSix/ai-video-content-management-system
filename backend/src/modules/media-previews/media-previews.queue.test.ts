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
      queueName: 'media_previews_queue',
      taskName: 'media_preview_task',
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
