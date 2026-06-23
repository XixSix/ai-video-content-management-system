export type NotificationType = "WORKSPACE_INVITATION"

export type NotificationInvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"

export type NotificationActor = {
  id: string
  email: string
  fullName: string | null
}

export type NotificationWorkspace = {
  id: string
  name: string
  slug: string
}

export type NotificationInvitation = {
  id: string
  status: NotificationInvitationStatus
  expiresAt: string
  workspace: NotificationWorkspace
}

export type NotificationItem = {
  id: string
  type: NotificationType
  title: string
  message: string
  data: unknown | null
  readAt: string | null
  createdAt: string
  actor: NotificationActor | null
  workspaceInvitation: NotificationInvitation | null
}

export type NotificationListParams = {
  page: number
  limit: number
  unreadOnly: boolean
}

export type NotificationListMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
}

export type NotificationListResponse = {
  items: NotificationItem[]
  meta: NotificationListMeta
}

export type NotificationUnreadCountResponse = {
  count: number
}

export type NotificationMarkReadResponse = {
  notification: NotificationItem
}

export type NotificationMarkAllReadResponse = {
  count: number
}

export type NotificationInvitationAction = {
  id: string
  status: NotificationInvitationStatus
  expiresAt: string
  respondedAt: string | null
  createdAt: string
  updatedAt: string
  workspace: NotificationWorkspace
  inviter: NotificationActor
  invitee: NotificationActor
}

export type NotificationInvitationActionResponse = {
  invitation: NotificationInvitationAction
}

export type NotificationReadyEvent = {
  event: "notification.ready"
  data: {
    unreadCount: number
  }
}

export type NotificationHeartbeatEvent = {
  event: "notification.heartbeat"
  data: {
    timestamp: string
  }
}

export type NotificationCreatedEvent = {
  event: "notification.created"
  data: NotificationItem
}

export type NotificationUpdatedEvent = {
  event: "notification.updated"
  data: NotificationItem
}

export type NotificationEventName =
  | NotificationReadyEvent["event"]
  | NotificationHeartbeatEvent["event"]
  | NotificationCreatedEvent["event"]
  | NotificationUpdatedEvent["event"]

export type NotificationEvent =
  | NotificationReadyEvent
  | NotificationHeartbeatEvent
  | NotificationCreatedEvent
  | NotificationUpdatedEvent

export type NotificationStreamStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"

export type NotificationStreamState = {
  status: NotificationStreamStatus
  error: string | null
  lastEventAt: string | null
}
