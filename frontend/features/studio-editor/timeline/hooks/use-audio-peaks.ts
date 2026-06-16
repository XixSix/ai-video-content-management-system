"use client"

import { useEffect, useState } from "react"

export function buildFallbackPeaks(barCount: number, seed: number) {
  return Array.from({ length: barCount }).map(
    (_, barIndex) => (18 + ((barIndex * seed + (barIndex % 7) * 11) % 76)) / 100
  )
}

function buildAudioPeaks(audioBuffer: AudioBuffer, barCount: number) {
  const channelData = audioBuffer.getChannelData(0)
  const samplesPerBar = Math.max(1, Math.floor(channelData.length / barCount))
  const peaks = Array.from({ length: barCount }).map((_, barIndex) => {
    const startIndex = barIndex * samplesPerBar
    const endIndex = Math.min(channelData.length, startIndex + samplesPerBar)
    let peak = 0

    for (let sampleIndex = startIndex; sampleIndex < endIndex; sampleIndex += 1) {
      peak = Math.max(peak, Math.abs(channelData[sampleIndex] ?? 0))
    }

    return peak
  })
  const maxPeak = Math.max(...peaks, 0.01)

  return peaks.map((peak) => Math.max(0.08, peak / maxPeak))
}

export function useAudioPeaks(
  sourceUrl: string | null | undefined,
  barCount: number
) {
  const [peaksState, setPeaksState] = useState<{
    peaks: number[]
    sourceUrl: string
  } | null>(null)

  useEffect(() => {
    if (!sourceUrl) {
      return
    }

    let isCancelled = false
    let isClosed = false
    const AudioContextConstructor =
      window.AudioContext ??
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext

    if (!AudioContextConstructor) {
      return
    }

    const audioContext = new AudioContextConstructor()

    const loadPeaks = async () => {
      try {
        const response = await fetch(sourceUrl)
        const audioData = await response.arrayBuffer()
        const audioBuffer = await audioContext.decodeAudioData(audioData)

        if (!isCancelled) {
          setPeaksState({
            peaks: buildAudioPeaks(audioBuffer, barCount),
            sourceUrl,
          })
        }
      } catch {
        if (!isCancelled) {
          setPeaksState(null)
        }
      } finally {
        if (!isClosed) {
          isClosed = true
          void audioContext.close()
        }
      }
    }

    void loadPeaks()

    return () => {
      isCancelled = true
      if (!isClosed) {
        isClosed = true
        void audioContext.close()
      }
    }
  }, [barCount, sourceUrl])

  if (!peaksState || peaksState.sourceUrl !== sourceUrl) {
    return null
  }

  return peaksState.peaks
}
