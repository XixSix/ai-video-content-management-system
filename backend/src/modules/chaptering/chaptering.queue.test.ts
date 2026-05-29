import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const publishCeleryTaskToQueueMock = jest.fn<(input: unknown) => Promise<void>>()

jest.unstable_mockModule('../../infrastructure/rabbitmq/publisher', () => ({
  publishCeleryTaskToQueue: publishCeleryTaskToQueueMock
}))

const { publishChapteringJob } = await import('./chaptering.queue')

const jobId = '00000000-0000-4000-8000-000000000001'
const mediaId = '00000000-0000-4000-8000-000000000002'
const userId = '00000000-0000-4000-8000-000000000003'
const transcriptId = '00000000-0000-4000-8000-000000000004'

describe('chaptering queue', () => {
  beforeEach(() => {
    publishCeleryTaskToQueueMock.mockReset()
    publishCeleryTaskToQueueMock.mockResolvedValue()
  })

  it('publishes chaptering jobs using the Celery task protocol contract', async () => {
    await publishChapteringJob({
      jobId,
      mediaId,
      userId,
      transcriptId,
      transcriptVersion: 2
    })

    expect(publishCeleryTaskToQueueMock).toHaveBeenCalledWith({
      queueName: 'chaptering_queue',
      taskName: 'chaptering_task',
      taskId: jobId,
      kwargs: {
        jobId,
        mediaId,
        userId,
        transcriptId,
        transcriptVersion: 2,
        taskName: 'generate_chapters'
      }
    })
  })
})
