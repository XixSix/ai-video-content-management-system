import type {
  NotificationInvitationAction,
  NotificationItem,
  NotificationListResponse,
} from "./notification.types"

export function countUnreadNotifications(items: NotificationItem[]): number {
  return items.reduce(
    (count, notification) => count + Number(notification.readAt === null),
    0
  )
}

export function findNotificationInLists(
  lists: NotificationListResponse[],
  notificationId: string
): NotificationItem | null {
  for (const list of lists) {
    const match = list.items.find(
      (notification) => notification.id === notificationId
    )

    if (match) {
      return match
    }
  }

  return null
}

export function mergeNotificationIntoList(
  current: NotificationListResponse | undefined,
  notification: NotificationItem,
  options?: {
    prependIfMissing?: boolean
  }
): NotificationListResponse | undefined {
  if (!current) {
    return current
  }

  const nextItems = [...current.items]
  const existingIndex = nextItems.findIndex(
    (item) => item.id === notification.id
  )

  if (existingIndex >= 0) {
    nextItems[existingIndex] = notification

    return {
      ...current,
      items: nextItems,
    }
  }

  if (!options?.prependIfMissing || current.meta.page !== 1) {
    return current
  }

  const items = [notification, ...nextItems].slice(0, current.meta.limit)
  const total = current.meta.total + 1

  return {
    items,
    meta: {
      ...current.meta,
      total,
      totalPages: Math.max(1, Math.ceil(total / current.meta.limit)),
    },
  }
}

export function markNotificationReadInList(
  current: NotificationListResponse | undefined,
  notificationId: string,
  readAt: string
): NotificationListResponse | undefined {
  if (!current) {
    return current
  }

  return {
    ...current,
    items: current.items.map((notification) =>
      notification.id === notificationId
        ? { ...notification, readAt }
        : notification
    ),
  }
}

export function markAllNotificationsReadInList(
  current: NotificationListResponse | undefined,
  readAt: string
): NotificationListResponse | undefined {
  if (!current) {
    return current
  }

  return {
    ...current,
    items: current.items.map((notification) =>
      notification.readAt === null ? { ...notification, readAt } : notification
    ),
  }
}

export function applyInvitationActionToList(
  current: NotificationListResponse | undefined,
  invitation: NotificationInvitationAction,
  readAt: string
): NotificationListResponse | undefined {
  if (!current) {
    return current
  }

  return {
    ...current,
    items: current.items.map((notification) => {
      if (notification.workspaceInvitation?.id !== invitation.id) {
        return notification
      }

      return {
        ...notification,
        readAt,
        workspaceInvitation: {
          ...notification.workspaceInvitation,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          workspace: invitation.workspace,
        },
      }
    }),
  }
}
