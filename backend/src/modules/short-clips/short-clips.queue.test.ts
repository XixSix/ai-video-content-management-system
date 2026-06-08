import { describe, expect, it, jest } from '@jest/globals'

const publishCeleryTaskToQueueMock = jest.fn<(input: unknown) => Promise<void>>()

jest.unstable_mockModule('../../infrastructure/rabbitmq/publisher', () => ({
  publishCeleryTaskToQueue: publishCeleryTaskToQueueMock
}))

const { publishShortClipJob } = await import('./short-clips.queue')

describe('short clips queue', () => {
  it('publishes short clip jobs as Celery tasks', async () => {
    publishCeleryTaskToQueueMock.mockResolvedValue()

    await publishShortClipJob({
      jobId: '00000000-0000-4000-8000-000000000001',
      mediaId: '00000000-0000-4000-8000-000000000002',
      userId: '00000000-0000-4000-8000-000000000003',
      transcriptId: '00000000-0000-4000-8000-000000000004',
      transcriptVersion: 2
    })

    expect(publishCeleryTaskToQueueMock).toHaveBeenCalledWith({
      queueName: 'short_clip_queue',
      taskName: 'short_clip_task',
      taskId: '00000000-0000-4000-8000-000000000001',
      kwargs: {
        jobId: '00000000-0000-4000-8000-000000000001',
        mediaId: '00000000-0000-4000-8000-000000000002',
        userId: '00000000-0000-4000-8000-000000000003',
        transcriptId: '00000000-0000-4000-8000-000000000004',
        transcriptVersion: 2,
        taskName: 'generate_short_clips'
      }
    })
  })
})
