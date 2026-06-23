"use client"

import type { ReactNode } from "react"

import { NotificationStreamProvider } from "@/features/notifications/components/notification-stream-provider"

import { useAuthSession } from "../hooks/use-auth-session"

export function AuthProvider({ children }: { children: ReactNode }) {
  useAuthSession()

  return (
    <>
      <NotificationStreamProvider />
      {children}
    </>
  )
}
