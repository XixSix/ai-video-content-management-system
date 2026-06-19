"use client"

import type { ReactNode } from "react"

import { useAuthSession } from "../hooks/use-auth-session"

export function AuthProvider({ children }: { children: ReactNode }) {
  useAuthSession()

  return children
}
