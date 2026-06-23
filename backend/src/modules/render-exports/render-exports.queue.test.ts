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
      mediaId: 'media-1',
      projectId: 'project-1',
      workspaceId: 'workspace-1',
      userId: 'user-1'
    })

    expect(publishCeleryTaskToQueueMock).toHaveBeenCalledWith({
      queueName: 'render_exports_queue',
      taskName: 'render_export_task',
      taskId: 'job-1',
      kwargs: {
        jobId: 'job-1',
        mediaId: 'media-1',
        projectId: 'project-1',
        workspaceId: 'workspace-1',
        userId: 'user-1',
        taskName: 'export_render'
      }
    })
  })
})
