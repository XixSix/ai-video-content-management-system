import { describe, expect, it, jest } from '@jest/globals'

const publishCeleryTaskToQueueMock = jest.fn<(input: unknown) => Promise<void>>()

jest.unstable_mockModule('../../infrastructure/rabbitmq/publisher', () => ({
  publishCeleryTaskToQueue: publishCeleryTaskToQueueMock
}))

const { publishGenerateShortClipsJob } = await import('./short-clips.queue')

describe('short clips queue', () => {
  it('publishes generate short clips jobs as Celery tasks', async () => {
    publishCeleryTaskToQueueMock.mockResolvedValue()

    await publishGenerateShortClipsJob({
      jobId: '00000000-0000-4000-8000-000000000001',
      jobType: 'GENERATE_SHORT_CLIPS'
    })

    expect(publishCeleryTaskToQueueMock).toHaveBeenCalledWith({
      queueName: 'generate_short_clips_queue',
      taskName: 'generate_short_clips_task',
      taskId: '00000000-0000-4000-8000-000000000001',
      kwargs: {
        version: 1,
        jobId: '00000000-0000-4000-8000-000000000001',
        jobType: 'GENERATE_SHORT_CLIPS',
        taskName: 'generate_short_clips'
      }
    })
  })
})
