import type { ListNotificationsQuery } from './notifications.schema'
import { NotificationsError } from './notifications.error'
import { toNotificationData } from './notifications.mapper'
import * as notificationsRepo from './notifications.repository'
import { publishNotificationEvent } from './notifications.realtime'
import type {
  MarkAllNotificationsReadResult,
  MarkNotificationReadResult,
  NotificationData,
  NotificationRecord,
  PaginatedNotifications
} from './notifications.types'

export const listNotifications = async (
  userId: string,
  query: ListNotificationsQuery
): Promise<PaginatedNotifications> => {
  await notificationsRepo.expirePendingInvitationsForRecipient(userId, new Date())

  const skip = (query.page - 1) * query.limit
  const [notifications, total] = await notificationsRepo.listNotifications(userId, query.unreadOnly, skip, query.limit)

  return {
    items: notifications.map(toNotificationData),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit)
  }
}

export const getUnreadCount = async (userId: string): Promise<number> => {
  await notificationsRepo.expirePendingInvitationsForRecipient(userId, new Date())
  return notificationsRepo.countUnreadNotifications(userId)
}

export const markNotificationRead = async (
  userId: string,
  notificationId: string
): Promise<MarkNotificationReadResult> => {
  const existing = await notificationsRepo.findNotificationForRecipient(notificationId, userId)

  if (!existing) {
    throw NotificationsError.notFound()
  }

  if (existing.readAt) {
    return {
      notification: toNotificationData(existing),
      changed: false
    }
  }

  const notification = await notificationsRepo.markNotificationRead(notificationId, userId, new Date())

  if (!notification) {
    throw NotificationsError.notFound()
  }

  const data = toNotificationData(notification)
  await publishSafely(userId, 'notification.updated', data)

  return {
    notification: data,
    changed: true
  }
}

export const markAllNotificationsRead = async (userId: string): Promise<MarkAllNotificationsReadResult> => {
  const notifications = await notificationsRepo.markAllNotificationsRead(userId, new Date())
  const data = notifications.map(toNotificationData)

  await Promise.all(data.map((notification) => publishSafely(userId, 'notification.updated', notification)))

  return {
    notifications: data,
    count: data.length
  }
}

export const publishCreatedNotification = async (notification: NotificationRecord): Promise<void> => {
  await publishSafely(notification.recipientId, 'notification.created', toNotificationData(notification))
}

export const publishUpdatedNotification = async (notification: NotificationRecord): Promise<void> => {
  await publishSafely(notification.recipientId, 'notification.updated', toNotificationData(notification))
}

const publishSafely = async (
  userId: string,
  event: 'notification.created' | 'notification.updated',
  data: NotificationData
): Promise<void> => {
  try {
    await publishNotificationEvent(userId, { event, data })
  } catch (error: unknown) {
    console.error(`Failed to publish ${event}`, error)
  }
}
