"use client"

import { LongToShortWorkspace } from "./long-to-short-workspace"
import { useLongToShortStore } from "../long-to-short.store"

export function LongToShortManager() {
  const isOpen = useLongToShortStore((state) => state.isManagerOpen)
  const setManagerOpen = useLongToShortStore((state) => state.setManagerOpen)

  return <LongToShortWorkspace open={isOpen} onOpenChange={setManagerOpen} />
}
