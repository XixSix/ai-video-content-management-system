"use client"

import { create } from "zustand"

export type AuthMode = "login" | "signup"

type AuthState = {
  isManagerOpen: boolean
  mode: AuthMode
  openManager: (mode?: AuthMode) => void
  closeManager: () => void
  setManagerOpen: (isOpen: boolean) => void
  setMode: (mode: AuthMode) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isManagerOpen: false,
  mode: "login",
  openManager: (mode = "login") => set({ isManagerOpen: true, mode }),
  closeManager: () => set({ isManagerOpen: false }),
  setManagerOpen: (isOpen) => set({ isManagerOpen: isOpen }),
  setMode: (mode) => set({ mode }),
}))
