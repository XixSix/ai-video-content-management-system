"use client"

import { create } from "zustand"

type SocialAccountsState = {
  isManagerOpen: boolean
  openManager: () => void
  closeManager: () => void
  setManagerOpen: (isOpen: boolean) => void
}

export const useSocialAccountsStore = create<SocialAccountsState>((set) => ({
  isManagerOpen: false,
  openManager: () => set({ isManagerOpen: true }),
  closeManager: () => set({ isManagerOpen: false }),
  setManagerOpen: (isOpen) => set({ isManagerOpen: isOpen }),
}))

