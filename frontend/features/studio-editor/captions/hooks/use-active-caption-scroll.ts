"use client"

import { useEffect, useRef } from "react"

export function useActiveCaptionScroll(activeCueId: string | undefined) {
  const activeCueRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!activeCueRef.current) {
      return
    }

    activeCueRef.current.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    })
  }, [activeCueId])

  return activeCueRef
}
