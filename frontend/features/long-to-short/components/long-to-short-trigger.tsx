"use client"

import type { ReactNode } from "react"

import { useLongToShortStore } from "../long-to-short.store"

type LongToShortTriggerProps = {
  children: ReactNode
  className?: string
}

export function LongToShortTrigger({
  children,
  className,
}: LongToShortTriggerProps) {
  const openLongToShort = useLongToShortStore((state) => state.openManager)

  return (
    <button type="button" className={className} onClick={() => openLongToShort()}>
      {children}
    </button>
  )
}
