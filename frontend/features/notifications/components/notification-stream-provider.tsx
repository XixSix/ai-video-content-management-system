"use client"

import { useNotificationStream } from "../hooks/use-notifications"

export function NotificationStreamProvider() {
  useNotificationStream()

  return null
}
