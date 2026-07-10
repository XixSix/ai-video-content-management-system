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
      jobType: 'PUBLISH'
    })

    expect(publishCeleryTaskToQueueMock).toHaveBeenCalledWith({
      queueName: 'publish_queue',
      taskName: 'publish_task',
      taskId: '00000000-0000-4000-8000-000000000001',
      eta: undefined,
      kwargs: {
        version: 1,
        jobId: '00000000-0000-4000-8000-000000000001',
        jobType: 'PUBLISH',
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
        jobType: 'PUBLISH'
      },
      eta
    )

    expect(publishCeleryTaskToQueueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eta,
        kwargs: expect.objectContaining({
          version: 1,
          jobId: '00000000-0000-4000-8000-000000000001',
          jobType: 'PUBLISH',
          taskName: 'publish'
        })
      })
    )
  })
})
