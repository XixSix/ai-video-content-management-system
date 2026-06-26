"use client"

import { create } from "zustand"

type LongToShortState = {
  isManagerOpen: boolean
  sourceMediaId: string | null
  openManager: (input?: { mediaId?: string | null }) => void
  closeManager: () => void
  setManagerOpen: (isOpen: boolean) => void
}

export const useLongToShortStore = create<LongToShortState>((set) => ({
  isManagerOpen: false,
  sourceMediaId: null,
  openManager: (input) =>
    set({
      isManagerOpen: true,
      sourceMediaId: input?.mediaId ?? null,
    }),
  closeManager: () => set({ isManagerOpen: false }),
  setManagerOpen: (isOpen) => set({ isManagerOpen: isOpen }),
}))
