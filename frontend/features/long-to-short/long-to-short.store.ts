"use client"

import { create } from "zustand"

type LongToShortState = {
  isManagerOpen: boolean
  openManager: () => void
  closeManager: () => void
  setManagerOpen: (isOpen: boolean) => void
}

export const useLongToShortStore = create<LongToShortState>((set) => ({
  isManagerOpen: false,
  openManager: () => set({ isManagerOpen: true }),
  closeManager: () => set({ isManagerOpen: false }),
  setManagerOpen: (isOpen) => set({ isManagerOpen: isOpen }),
}))
