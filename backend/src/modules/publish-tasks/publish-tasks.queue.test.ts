import { describe, expect, it, jest } from '@jest/globals'

const publishCeleryTaskToQueueMock = jest.fn<(input: unknown) => Promise<void>>()

jest.unstable_mockModule('../../infrastructure/rabbitmq/publisher', () => ({
  publishCeleryTaskToQueue: publishCeleryTaskToQueueMock
}))

const { publishPublishTaskJob } = await import('./publish-tasks.queue')

describe('publish tasks queue', () => {
  it('publishes publish task jobs as Celery tasks', async () => {
    publishCeleryTaskToQueueMock.mockResolvedValue()

    await publishPublishTaskJob({
      jobId: '00000000-0000-4000-8000-000000000001',
      publishTaskId: '00000000-0000-4000-8000-000000000002',
      mediaId: '00000000-0000-4000-8000-000000000003',
      projectId: null,
      shortClipId: null,
      exportAssetId: null,
      userId: '00000000-0000-4000-8000-000000000004',
      platform: 'FACEBOOK',
      platformAccountId: '00000000-0000-4000-8000-000000000005',
      scheduledAt: null
    })

    expect(publishCeleryTaskToQueueMock).toHaveBeenCalledWith({
      queueName: 'publish_queue',
      taskName: 'publish_task',
      taskId: '00000000-0000-4000-8000-000000000001',
      eta: undefined,
      kwargs: {
        jobId: '00000000-0000-4000-8000-000000000001',
        publishTaskId: '00000000-0000-4000-8000-000000000002',
        mediaId: '00000000-0000-4000-8000-000000000003',
        projectId: null,
        shortClipId: null,
        exportAssetId: null,
        userId: '00000000-0000-4000-8000-000000000004',
        platform: 'FACEBOOK',
        platformAccountId: '00000000-0000-4000-8000-000000000005',
        scheduledAt: null,
        taskName: 'publish'
      }
    })
  })

  it('passes scheduled publish jobs with a Celery ETA', async () => {
    const eta = '2026-06-10T10:00:00.000Z'

    publishCeleryTaskToQueueMock.mockClear()
    publishCeleryTaskToQueueMock.mockResolvedValue()

    await publishPublishTaskJob(
      {
        jobId: '00000000-0000-4000-8000-000000000001',
        publishTaskId: '00000000-0000-4000-8000-000000000002',
        mediaId: null,
        projectId: null,
        shortClipId: '00000000-0000-4000-8000-000000000003',
        exportAssetId: null,
        userId: '00000000-0000-4000-8000-000000000004',
        platform: 'FACEBOOK',
        platformAccountId: '00000000-0000-4000-8000-000000000005',
        scheduledAt: eta
      },
      eta
    )

    expect(publishCeleryTaskToQueueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eta,
        kwargs: expect.objectContaining({
          shortClipId: '00000000-0000-4000-8000-000000000003',
          scheduledAt: eta,
          taskName: 'publish'
        })
      })
    )
  })
})
