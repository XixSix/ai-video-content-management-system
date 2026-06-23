import type { NotificationListParams } from "../notification.types"

function normalizeParams(params: NotificationListParams) {
  return {
    page: params.page,
    limit: params.limit,
    unreadOnly: params.unreadOnly,
  }
}

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationQueryKeys.all, "list"] as const,
  list: (params: NotificationListParams) =>
    [...notificationQueryKeys.lists(), normalizeParams(params)] as const,
  unreadCount: () => [...notificationQueryKeys.all, "unread-count"] as const,
  streamState: () => [...notificationQueryKeys.all, "stream-state"] as const,
}
