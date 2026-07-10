import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const publishCeleryTaskToQueueMock = jest.fn<(input: unknown) => Promise<void>>()

jest.unstable_mockModule('../../infrastructure/rabbitmq/publisher', () => ({
  publishCeleryTaskToQueue: publishCeleryTaskToQueueMock
}))

const { publishGenerateChaptersJob } = await import('./chapters.queue')

const jobId = '00000000-0000-4000-8000-000000000001'
describe('chapters queue', () => {
  beforeEach(() => {
    publishCeleryTaskToQueueMock.mockReset()
    publishCeleryTaskToQueueMock.mockResolvedValue()
  })

  it('publishes generate chapters jobs using the Celery task protocol contract', async () => {
    await publishGenerateChaptersJob({
      jobId,
      jobType: 'GENERATE_CHAPTERS'
    })

    expect(publishCeleryTaskToQueueMock).toHaveBeenCalledWith({
      queueName: 'generate_chapters_queue',
      taskName: 'generate_chapters_task',
      taskId: jobId,
      kwargs: {
        version: 1,
        jobId,
        jobType: 'GENERATE_CHAPTERS',
        taskName: 'generate_chapters'
      }
    })
  })
})
