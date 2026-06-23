"use client"

import { useCallback, useEffect, useRef } from "react"

import { isAbortError, syncMediaElementTime } from "../lib/media-sync"

export function getNextCompositionTime({
  currentTime,
  elapsedSeconds,
  timelineDurationSeconds,
}: {
  currentTime: number
  elapsedSeconds: number
  timelineDurationSeconds: number
}) {
  return Math.min(
    timelineDurationSeconds,
    Math.max(0, currentTime + Math.max(0, elapsedSeconds))
  )
}

export function useCompositionClock({
  currentTime,
  enabled = true,
  isPlaying,
  pausePlayback,
  seekToTime,
  timelineDurationSeconds,
}: {
  currentTime: number
  enabled?: boolean
  isPlaying: boolean
  pausePlayback: () => void
  seekToTime: (timeSeconds: number) => void
  timelineDurationSeconds: number
}) {
  const currentTimeRef = useRef(currentTime)

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  useEffect(() => {
    if (!enabled || !isPlaying) return

    let animationFrameId = 0
    let previousFrameTime = performance.now()

    const advanceFrame = (frameTime: number) => {
      const elapsedSeconds = Math.max(0, (frameTime - previousFrameTime) / 1000)
      previousFrameTime = frameTime
      const nextTime = getNextCompositionTime({
        currentTime: currentTimeRef.current,
        elapsedSeconds,
        timelineDurationSeconds,
      })

      currentTimeRef.current = nextTime
      seekToTime(nextTime)

      if (nextTime >= timelineDurationSeconds) {
        pausePlayback()
        return
      }

      animationFrameId = window.requestAnimationFrame(advanceFrame)
    }

    animationFrameId = window.requestAnimationFrame(advanceFrame)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [enabled, isPlaying, pausePlayback, seekToTime, timelineDurationSeconds])
}

export function useSyncedCompositionMedia({
  isPlaying,
  localTime,
  muted,
  onPlaybackError,
}: {
  isPlaying: boolean
  localTime: number
  muted: boolean
  onPlaybackError?: () => void
}) {
  const mediaRef = useRef<HTMLMediaElement | null>(null)
  const localTimeRef = useRef(localTime)
  const mutedRef = useRef(muted)
  const onPlaybackErrorRef = useRef(onPlaybackError)

  const setMediaElement = useCallback((element: HTMLMediaElement | null) => {
    mediaRef.current = element

    if (element) {
      element.muted = mutedRef.current
      syncMediaElementTime(element, localTimeRef.current)
    }
  }, [])

  useEffect(() => {
    localTimeRef.current = localTime

    if (mediaRef.current) {
      syncMediaElementTime(mediaRef.current, localTime)
    }
  }, [localTime])

  useEffect(() => {
    mutedRef.current = muted

    if (mediaRef.current) {
      mediaRef.current.muted = muted
    }
  }, [muted])

  useEffect(() => {
    onPlaybackErrorRef.current = onPlaybackError
  }, [onPlaybackError])

  useEffect(() => {
    const mediaElement = mediaRef.current

    if (!mediaElement) return

    if (!isPlaying) {
      mediaElement.pause()
      return
    }

    syncMediaElementTime(mediaElement, localTimeRef.current)
    mediaElement.play().catch((error: unknown) => {
      if (!isAbortError(error)) {
        onPlaybackErrorRef.current?.()
      }
    })

    return () => {
      mediaElement.pause()
    }
  }, [isPlaying])

  return setMediaElement
}
