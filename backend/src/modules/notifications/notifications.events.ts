import type { Response } from 'express'
import { subscribeToNotificationEvents } from './notifications.realtime'
import * as notificationsService from './notifications.service'
import type { NotificationEventData, NotificationEventName, NotificationRealtimeMessage } from './notifications.types'

export const NOTIFICATION_HEARTBEAT_INTERVAL_MS = 15000

export interface NotificationEventStreamInput {
  onError(error: unknown): void
  res: Response
  userId: string
}

export const streamNotificationEvents = async ({
  onError,
  res,
  userId
}: NotificationEventStreamInput): Promise<void> => {
  let heartbeatInterval: NodeJS.Timeout | undefined
  let isClosed = false
  let isReady = false
  const bufferedMessages: NotificationRealtimeMessage[] = []

  const writeMessage = (message: NotificationRealtimeMessage): void => {
    if (!isReady) {
      bufferedMessages.push(message)
      return
    }

    emitEvent(res, message.event, message.data)
  }

  const unsubscribe = subscribeToNotificationEvents(userId, writeMessage)

  const cleanup = (): void => {
    if (isClosed) {
      return
    }

    isClosed = true
    unsubscribe()

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
    }
  }

  try {
    const unreadCount = await notificationsService.getUnreadCount(userId)

    prepareEventStream(res)
    res.on('close', cleanup)

    emitEvent(res, 'notification.ready', { unreadCount })
    isReady = true

    for (const message of bufferedMessages.splice(0)) {
      emitEvent(res, message.event, message.data)
    }

    heartbeatInterval = setInterval(() => {
      if (!isClosed) {
        emitEvent(res, 'notification.heartbeat', { timestamp: new Date().toISOString() })
      }
    }, NOTIFICATION_HEARTBEAT_INTERVAL_MS)
  } catch (error: unknown) {
    cleanup()
    onError(error)
  }
}

const prepareEventStream = (res: Response): void => {
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
}

const emitEvent = (res: Response, event: NotificationEventName, data: NotificationEventData): void => {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}
