import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const publishCeleryTaskToQueueMock = jest.fn<(input: unknown) => Promise<void>>()

jest.unstable_mockModule('../../infrastructure/rabbitmq/publisher', () => ({
  publishCeleryTaskToQueue: publishCeleryTaskToQueueMock
}))

const { publishRenderExportJob } = await import('./render-exports.queue')

describe('render exports queue', () => {
  beforeEach(() => {
    publishCeleryTaskToQueueMock.mockReset()
    publishCeleryTaskToQueueMock.mockResolvedValue()
  })

  it('publishes render export jobs using the Celery task protocol contract', async () => {
    await publishRenderExportJob({
      jobId: 'job-1',
      jobType: 'EXPORT_RENDER'
    })

    expect(publishCeleryTaskToQueueMock).toHaveBeenCalledWith({
      queueName: 'render_exports_queue',
      taskName: 'render_export_task',
      taskId: 'job-1',
      kwargs: {
        version: 1,
        jobId: 'job-1',
        jobType: 'EXPORT_RENDER',
        taskName: 'export_render'
      }
    })
  })
})
