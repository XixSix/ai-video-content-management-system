import { describe, expect, it, jest } from '@jest/globals'
import type { NotificationRealtimeMessage } from './notifications.types'

const connectMock = jest.fn<() => Promise<void>>()
const pSubscribeMock = jest.fn()
const pUnsubscribeMock = jest.fn<() => Promise<void>>()
const quitMock = jest.fn<() => Promise<void>>()
const publishMock = jest.fn<() => Promise<number>>()
const onMock = jest.fn()

const subscriber = {
  isReady: false,
  isOpen: true,
  connect: connectMock,
  pSubscribe: pSubscribeMock,
  pUnsubscribe: pUnsubscribeMock,
  quit: quitMock,
  on: onMock
}

const redisClient = {
  duplicate: jest.fn(() => subscriber),
  publish: publishMock
}

jest.unstable_mockModule('../../infrastructure/redis/client', () => ({
  getRedisClient: () => redisClient
}))

const realtime = await import('./notifications.realtime')

describe('notification realtime Redis bridge', () => {
  it('fans Redis messages out to local user listeners and publishes on user channels', async () => {
    connectMock.mockResolvedValue()
    pSubscribeMock.mockResolvedValue()
    pUnsubscribeMock.mockResolvedValue()
    quitMock.mockResolvedValue()
    publishMock.mockResolvedValue(1)

    await realtime.connectNotificationRealtime()

    const redisHandler = pSubscribeMock.mock.calls[0]?.[1] as ((message: string, channel: string) => void) | undefined
    const listener = jest.fn()
    const unsubscribe = realtime.subscribeToNotificationEvents('00000000-0000-4000-8000-000000000001', listener)
    const message: NotificationRealtimeMessage = {
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
    }

    redisHandler?.(JSON.stringify(message), 'notifications:user:00000000-0000-4000-8000-000000000001')
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'notification.created'
      })
    )

    await realtime.publishNotificationEvent('00000000-0000-4000-8000-000000000001', message)
    expect(publishMock).toHaveBeenCalledWith(
      'notifications:user:00000000-0000-4000-8000-000000000001',
      JSON.stringify(message)
    )

    unsubscribe()
    await realtime.disconnectNotificationRealtime()
    expect(pUnsubscribeMock).toHaveBeenCalledWith('notifications:user:*')
    expect(quitMock).toHaveBeenCalled()
  })
})
