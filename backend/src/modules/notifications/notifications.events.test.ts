import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { Response } from 'express'
import type { NotificationRealtimeMessage } from './notifications.types'

const getUnreadCountMock = jest.fn()
const cleanupMock = jest.fn()
let realtimeListener: ((message: NotificationRealtimeMessage) => void) | undefined

jest.unstable_mockModule('./notifications.service', () => ({
  getUnreadCount: getUnreadCountMock
}))

jest.unstable_mockModule('./notifications.realtime', () => ({
  subscribeToNotificationEvents: (_userId: string, listener: (message: NotificationRealtimeMessage) => void) => {
    realtimeListener = listener
    return cleanupMock
  }
}))

const { streamNotificationEvents } = await import('./notifications.events')

class FakeResponse extends EventEmitter {
  public headers = new Map<string, string>()
  public statusCode = 0
  public writes: string[] = []

  status(code: number): this {
    this.statusCode = code
    return this
  }

  setHeader(name: string, value: string): this {
    this.headers.set(name, value)
    return this
  }

  flushHeaders(): void {}

  write(chunk: string): boolean {
    this.writes.push(chunk)
    return true
  }
}

beforeEach(() => {
  jest.resetAllMocks()
  realtimeListener = undefined
  getUnreadCountMock.mockResolvedValue(2)
})

describe('notification SSE stream', () => {
  it('sends ready and realtime events with SSE headers, then cleans up on close', async () => {
    const response = new FakeResponse()
    const onError = jest.fn()

    await streamNotificationEvents({
      userId: '00000000-0000-4000-8000-000000000001',
      res: response as unknown as Response,
      onError
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    expect(response.headers.get('X-Accel-Buffering')).toBe('no')
    expect(response.writes.join('')).toContain('event: notification.ready')
    expect(response.writes.join('')).toContain('"unreadCount":2')

    realtimeListener?.({
      event: 'notification.created',
      data: {
        id: '00000000-0000-4000-8000-000000000002',
        type: 'WORKSPACE_INVITATION',
        title: 'Workspace invitation',
        message: 'You were invited',
        data: null,
        readAt: null,
        createdAt: new Date('2026-06-21T10:00:00.000Z'),
        actor: null,
        workspaceInvitation: null
      }
    })

    expect(response.writes.join('')).toContain('event: notification.created')

    response.emit('close')
    expect(cleanupMock).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })

  it('cleans up and delegates initialization failures before sending headers', async () => {
    const response = new FakeResponse()
    const onError = jest.fn()
    const error = new Error('database unavailable')
    getUnreadCountMock.mockRejectedValue(error)

    await streamNotificationEvents({
      userId: '00000000-0000-4000-8000-000000000001',
      res: response as unknown as Response,
      onError
    })

    expect(response.statusCode).toBe(0)
    expect(cleanupMock).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(error)
  })
})
