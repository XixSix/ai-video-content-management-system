"use client"

import { useEffect, useState } from "react"

import type { StudioCaptionCue } from "../../studio.types"
import {
  filterCaptionCues,
  getActiveCueId,
} from "../lib/caption-activity"

const SEARCH_DEBOUNCE_MS = 220

export function useCaptionSearch({
  cues,
  currentTime,
}: {
  cues: StudioCaptionCue[]
  currentTime: number
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const filteredCues = filterCaptionCues(cues, search)
  const activeCueId = getActiveCueId({
    cues,
    currentTime,
    filteredCues,
  })

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput)
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchInput])

  const closeSearch = () => {
    setSearchInput("")
    setSearch("")
    setIsSearchOpen(false)
  }

  return {
    activeCueId,
    closeSearch,
    filteredCues,
    isSearchOpen,
    searchInput,
    setIsSearchOpen,
    setSearch,
    setSearchInput,
  }
}
