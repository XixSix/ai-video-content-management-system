import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const publishCeleryTaskToQueueMock = jest.fn<(input: unknown) => Promise<void>>()

jest.unstable_mockModule('../../infrastructure/rabbitmq/publisher', () => ({
  publishCeleryTaskToQueue: publishCeleryTaskToQueueMock
}))

const { publishTranscriptJob } = await import('./transcripts.queue')

const jobId = '00000000-0000-4000-8000-000000000003'
const mediaId = '00000000-0000-4000-8000-000000000001'
const userId = '00000000-0000-4000-8000-000000000002'
const s3Key = 'uploads/users/user/videos/video.mp4'

describe('transcript queue', () => {
  beforeEach(() => {
    publishCeleryTaskToQueueMock.mockReset()
    publishCeleryTaskToQueueMock.mockResolvedValue()
  })

  it('publishes transcript jobs using the Celery task protocol contract', async () => {
    await publishTranscriptJob({ jobId, mediaId, userId, s3Key })

    expect(publishCeleryTaskToQueueMock).toHaveBeenCalledWith({
      queueName: 'transcript_queue',
      taskName: 'transcript_task',
      taskId: jobId,
      kwargs: {
        jobId,
        mediaId,
        userId,
        s3Key,
        taskName: 'transcribe'
      }
    })
  })
})
