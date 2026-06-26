"use client"

import { useEffect, useState } from "react"

import {
  normalizeWaveformPeaks,
  parseWaveformPeaksPayload,
} from "@/features/media-library/lib/media-previews"

export function useAudioPeaks(waveformUrl: string | null | undefined) {
  const [peaksState, setPeaksState] = useState<{
    peaks: number[]
    requestKey: string
  } | null>(null)
  const requestKey = waveformUrl ?? ""

  useEffect(() => {
    if (!waveformUrl) {
      return
    }

    const abortController = new AbortController()

    const loadPeaks = async () => {
      try {
        const response = await fetch(waveformUrl, {
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error("Unable to load waveform peaks")
        }

        const payload = parseWaveformPeaksPayload(await response.json())

        if (!payload) {
          throw new Error("Waveform peaks payload is invalid")
        }

        setPeaksState({
          peaks: normalizeWaveformPeaks(payload),
          requestKey: waveformUrl,
        })
      } catch (error) {
        if (
          !abortController.signal.aborted &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setPeaksState(null)
        }
      }
    }

    void loadPeaks()

    return () => {
      abortController.abort()
    }
  }, [waveformUrl])

  if (!peaksState || peaksState.requestKey !== requestKey) {
    return null
  }

  return peaksState.peaks
}
