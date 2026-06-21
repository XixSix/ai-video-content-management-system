import type { NotificationData, NotificationRecord } from './notifications.types'

export const toNotificationData = (notification: NotificationRecord): NotificationData => ({
  id: notification.id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  data: notification.data,
  readAt: notification.readAt,
  createdAt: notification.createdAt,
  actor: notification.actor,
  workspaceInvitation: notification.workspaceInvitation
})
