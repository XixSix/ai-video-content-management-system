import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const publishCeleryTaskToQueueMock = jest.fn<(input: unknown) => Promise<void>>()

jest.unstable_mockModule('../../infrastructure/rabbitmq/publisher', () => ({
  publishCeleryTaskToQueue: publishCeleryTaskToQueueMock
}))

const { publishTranscriptBurnJob, publishTranscriptExportJob, publishTranscriptJob } =
  await import('./transcripts.queue')

const jobId = '00000000-0000-4000-8000-000000000003'
describe('transcript queue', () => {
  beforeEach(() => {
    publishCeleryTaskToQueueMock.mockReset()
    publishCeleryTaskToQueueMock.mockResolvedValue()
  })

  it('publishes transcript jobs using the Celery task protocol contract', async () => {
    await publishTranscriptJob({ jobId, jobType: 'TRANSCRIBE' })

    expect(publishCeleryTaskToQueueMock).toHaveBeenCalledWith({
      queueName: 'transcribe_queue',
      taskName: 'transcribe_task',
      taskId: jobId,
      kwargs: {
        version: 1,
        jobId,
        jobType: 'TRANSCRIBE',
        taskName: 'transcribe'
      }
    })
  })

  it('publishes transcript export jobs using the Celery task protocol contract', async () => {
    await publishTranscriptExportJob({
      jobId,
      jobType: 'GENERATE_SUBTITLE'
    })

    expect(publishCeleryTaskToQueueMock).toHaveBeenCalledWith({
      queueName: 'transcribe_queue',
      taskName: 'transcribe_task',
      taskId: jobId,
      kwargs: {
        version: 1,
        jobId,
        jobType: 'GENERATE_SUBTITLE',
        taskName: 'export_transcript'
      }
    })
  })

  it('publishes transcript burn jobs using the Celery task protocol contract', async () => {
    await publishTranscriptBurnJob({
      jobId,
      jobType: 'BURN_SUBTITLE'
    })

    expect(publishCeleryTaskToQueueMock).toHaveBeenCalledWith({
      queueName: 'transcribe_queue',
      taskName: 'transcribe_task',
      taskId: jobId,
      kwargs: {
        version: 1,
        jobId,
        jobType: 'BURN_SUBTITLE',
        taskName: 'burn_transcript'
      }
    })
  })
})
