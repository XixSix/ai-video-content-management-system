import type {
  NotificationType,
  Prisma,
  WorkspaceInvitationStatus
} from '../../infrastructure/db/generated/prisma/client'

export type NotificationEventName =
  | 'notification.created'
  | 'notification.heartbeat'
  | 'notification.ready'
  | 'notification.updated'

export interface NotificationActorData {
  id: string
  email: string
  fullName: string | null
}

export interface NotificationWorkspaceData {
  id: string
  name: string
  slug: string
}

export interface NotificationInvitationData {
  id: string
  status: WorkspaceInvitationStatus
  expiresAt: Date
  workspace: NotificationWorkspaceData
}

export interface NotificationData {
  id: string
  type: NotificationType
  title: string
  message: string
  data: Prisma.JsonValue | null
  readAt: Date | null
  createdAt: Date
  actor: NotificationActorData | null
  workspaceInvitation: NotificationInvitationData | null
}

export interface NotificationReadyData {
  unreadCount: number
}

export interface NotificationHeartbeatData {
  timestamp: string
}

export type NotificationEventData = NotificationData | NotificationHeartbeatData | NotificationReadyData

export interface NotificationRealtimeMessage {
  event: Extract<NotificationEventName, 'notification.created' | 'notification.updated'>
  data: NotificationData
}

export interface PaginatedNotifications {
  items: NotificationData[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface MarkNotificationReadResult {
  notification: NotificationData
  changed: boolean
}

export interface MarkAllNotificationsReadResult {
  notifications: NotificationData[]
  count: number
}

export interface NotificationRecord {
  id: string
  recipientId: string
  actorId: string | null
  workspaceInvitationId: string | null
  type: NotificationType
  title: string
  message: string
  data: Prisma.JsonValue | null
  readAt: Date | null
  createdAt: Date
  actor: NotificationActorData | null
  workspaceInvitation: NotificationInvitationData | null
}
