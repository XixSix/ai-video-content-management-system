import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const assertQueueMock = jest.fn<(queueName: string, options: unknown) => Promise<unknown>>()
const closeMock = jest.fn<() => Promise<void>>()
const sendToQueueMock = jest.fn<(queueName: string, content: Buffer, options: unknown) => boolean>()
const createChannelMock = jest.fn<() => Promise<unknown>>()

jest.unstable_mockModule('./client', () => ({
  getRabbitMQConnection: () => ({
    createChannel: createChannelMock
  })
}))

const { publishCeleryTaskToQueue } = await import('./publisher')

describe('rabbitmq publisher', () => {
  beforeEach(() => {
    assertQueueMock.mockReset()
    closeMock.mockReset()
    sendToQueueMock.mockReset()
    createChannelMock.mockReset()

    assertQueueMock.mockResolvedValue(undefined)
    closeMock.mockResolvedValue()
    sendToQueueMock.mockReturnValue(true)
    createChannelMock.mockResolvedValue({
      assertQueue: assertQueueMock,
      close: closeMock,
      sendToQueue: sendToQueueMock
    })
  })

  it('publishes Celery protocol v2 JSON task messages', async () => {
    await publishCeleryTaskToQueue({
      queueName: 'transcript_queue',
      taskName: 'transcript_task',
      taskId: '00000000-0000-4000-8000-000000000003',
      kwargs: {
        jobId: '00000000-0000-4000-8000-000000000003',
        taskName: 'transcribe'
      }
    })

    expect(assertQueueMock).toHaveBeenCalledWith('transcript_queue', { durable: true })
    expect(sendToQueueMock).toHaveBeenCalledTimes(1)

    const [queueName, content, options] = sendToQueueMock.mock.calls[0]
    expect(queueName).toBe('transcript_queue')
    expect(JSON.parse(content.toString())).toEqual([
      [],
      {
        jobId: '00000000-0000-4000-8000-000000000003',
        taskName: 'transcribe'
      },
      {
        callbacks: null,
        errbacks: null,
        chain: null,
        chord: null
      }
    ])
    expect(options).toMatchObject({
      contentType: 'application/json',
      contentEncoding: 'utf-8',
      persistent: true,
      correlationId: '00000000-0000-4000-8000-000000000003',
      headers: {
        lang: 'py',
        task: 'transcript_task',
        id: '00000000-0000-4000-8000-000000000003',
        root_id: '00000000-0000-4000-8000-000000000003',
        parent_id: null,
        group: null,
        replaced_task_nesting: 0
      }
    })
    expect(closeMock).toHaveBeenCalled()
  })
})
