"use client"

import { create } from "zustand"

import {
  MOCK_AUTH_COOKIE_MAX_AGE_SECONDS,
  MOCK_AUTH_COOKIE_NAME,
} from "./auth.constants"

export type AuthMode = "login" | "signup"

type MockAuthUser = {
  name: string
  email: string
  initials: string
}

type AuthState = {
  isAuthenticated: boolean
  user: MockAuthUser | null
  login: (email: string) => void
  signup: (input: { name: string; email: string }) => void
  logout: () => void
}

function getInitials(nameOrEmail: string) {
  const parts = nameOrEmail
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)

  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  return initials || "U"
}

function setMockSessionCookie() {
  document.cookie = `${MOCK_AUTH_COOKIE_NAME}=1; path=/; max-age=${MOCK_AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
}

function clearMockSessionCookie() {
  document.cookie = `${MOCK_AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
}

function hasMockSessionCookie() {
  if (typeof document === "undefined") {
    return false
  }

  return document.cookie
    .split("; ")
    .some((cookie) => cookie.startsWith(`${MOCK_AUTH_COOKIE_NAME}=`))
}

const defaultUser: MockAuthUser = {
  name: "VidPilot Creator",
  email: "creator@example.com",
  initials: "VC",
}

const hasInitialSession = hasMockSessionCookie()

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: hasInitialSession,
  user: hasInitialSession ? defaultUser : null,
  login: (email) => {
    const normalizedEmail = email || "creator@example.com"

    setMockSessionCookie()
    set({
      isAuthenticated: true,
      user: {
        name: "VidPilot Creator",
        email: normalizedEmail,
        initials: getInitials(normalizedEmail),
      },
    })
  },
  signup: ({ name, email }) => {
    const displayName = name || "VidPilot Creator"
    const normalizedEmail = email || "creator@example.com"

    setMockSessionCookie()
    set({
      isAuthenticated: true,
      user: {
        name: displayName,
        email: normalizedEmail,
        initials: getInitials(displayName),
      },
    })
  },
  logout: () => {
    clearMockSessionCookie()
    set({
      isAuthenticated: false,
      user: null,
    })
  },
}))
