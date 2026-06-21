import { getRedisClient } from '../../infrastructure/redis/client'
import type { NotificationRealtimeMessage } from './notifications.types'

const NOTIFICATION_CHANNEL_PATTERN = 'notifications:user:*'
const NOTIFICATION_CHANNEL_PREFIX = 'notifications:user:'

type NotificationListener = (message: NotificationRealtimeMessage) => void

const listenersByUserId = new Map<string, Set<NotificationListener>>()

const createSubscriber = () => getRedisClient().duplicate()
let subscriber: ReturnType<typeof createSubscriber> | null = null

const getUserIdFromChannel = (channel: string): string | null =>
  channel.startsWith(NOTIFICATION_CHANNEL_PREFIX) ? channel.slice(NOTIFICATION_CHANNEL_PREFIX.length) : null

const handleRedisMessage = (rawMessage: string, channel: string): void => {
  const userId = getUserIdFromChannel(channel)

  if (!userId) {
    return
  }

  try {
    const message = JSON.parse(rawMessage) as NotificationRealtimeMessage

    for (const listener of listenersByUserId.get(userId) ?? []) {
      listener(message)
    }
  } catch (error: unknown) {
    console.error('Failed to process notification realtime message', error)
  }
}

export const connectNotificationRealtime = async (): Promise<void> => {
  if (subscriber?.isReady) {
    return
  }

  subscriber = createSubscriber()
  subscriber.on('error', (error: Error) => {
    console.error('Notification Redis subscriber error', error)
  })

  await subscriber.connect()
  await subscriber.pSubscribe(NOTIFICATION_CHANNEL_PATTERN, handleRedisMessage)
}

export const disconnectNotificationRealtime = async (): Promise<void> => {
  listenersByUserId.clear()

  if (!subscriber?.isOpen) {
    subscriber = null
    return
  }

  await subscriber.pUnsubscribe(NOTIFICATION_CHANNEL_PATTERN)
  await subscriber.quit()
  subscriber = null
}

export const subscribeToNotificationEvents = (userId: string, listener: NotificationListener): (() => void) => {
  const listeners = listenersByUserId.get(userId) ?? new Set<NotificationListener>()
  listeners.add(listener)
  listenersByUserId.set(userId, listeners)

  return (): void => {
    const currentListeners = listenersByUserId.get(userId)

    if (!currentListeners) {
      return
    }

    currentListeners.delete(listener)

    if (currentListeners.size === 0) {
      listenersByUserId.delete(userId)
    }
  }
}

export const publishNotificationEvent = async (userId: string, message: NotificationRealtimeMessage): Promise<void> => {
  await getRedisClient().publish(`${NOTIFICATION_CHANNEL_PREFIX}${userId}`, JSON.stringify(message))
}
