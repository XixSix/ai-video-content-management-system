import { formatDistanceToNowStrict } from "date-fns"
import { CheckCircle2, Clock3, XCircle, Users } from "lucide-react"

import type {
  NotificationEvent,
  NotificationInvitation,
  NotificationItem,
} from "./notification.types"

export function canRespondToNotificationInvitation(
  notification: NotificationItem
): boolean {
  return notification.workspaceInvitation?.status === "PENDING"
}

export function getNotificationBadgeLabel(count: number): string {
  if (count > 99) {
    return "99+"
  }

  return String(count)
}

export function getNotificationInvitationStatusLabel(
  invitation: NotificationInvitation | null
): string | null {
  if (!invitation) {
    return null
  }

  switch (invitation.status) {
    case "PENDING":
      return "Pending invitation"
    case "ACCEPTED":
      return "Accepted"
    case "DECLINED":
      return "Declined"
    case "EXPIRED":
      return "Expired"
  }
}

export function getNotificationTimestampLabel(createdAt: string): string {
  const timestamp = new Date(createdAt)

  if (Number.isNaN(timestamp.getTime())) {
    return "Just now"
  }

  return `${formatDistanceToNowStrict(timestamp, {
    addSuffix: true,
  })}`.replace("about ", "")
}

export function getNotificationIcon(notification: NotificationItem) {
  switch (notification.workspaceInvitation?.status) {
    case "ACCEPTED":
      return CheckCircle2
    case "DECLINED":
    case "EXPIRED":
      return XCircle
    case "PENDING":
      return Users
    default:
      return Clock3
  }
}

export function isNotificationRealtimeEvent(
  event: NotificationEvent
): event is Extract<
  NotificationEvent,
  { event: "notification.created" | "notification.updated" }
> {
  return (
    event.event === "notification.created" ||
    event.event === "notification.updated"
  )
}
