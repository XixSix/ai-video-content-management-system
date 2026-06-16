"use client"

import { useCallback, useEffect, useRef } from "react"

import {
  isAbortError,
  syncMediaElementTime,
} from "../lib/media-sync"

export function useCanvasMediaSync({
  audioTrackMuted,
  currentTime,
  durationSeconds,
  hasNativeMediaPreview,
  isPlaying,
  pausePlayback,
  seekToTime,
  sourceTrackMuted,
}: {
  audioTrackMuted: boolean
  currentTime: number
  durationSeconds: number
  hasNativeMediaPreview: boolean
  isPlaying: boolean
  pausePlayback: () => void
  seekToTime: (timeSeconds: number) => void
  sourceTrackMuted: boolean
}) {
  const previewMediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null)
  const guideAudioRef = useRef<HTMLAudioElement>(null)
  const currentTimeRef = useRef(currentTime)
  const setPreviewMediaElement = useCallback(
    (element: HTMLVideoElement | HTMLAudioElement | null) => {
      previewMediaRef.current = element
    },
    []
  )
  const setGuideAudioElement = useCallback((element: HTMLAudioElement | null) => {
    guideAudioRef.current = element
  }, [])

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  useEffect(() => {
    const previewMedia = previewMediaRef.current
    const guideAudio = guideAudioRef.current

    if (previewMedia && currentTime <= durationSeconds) {
      syncMediaElementTime(previewMedia, currentTime, durationSeconds)
    }

    if (guideAudio) {
      syncMediaElementTime(guideAudio, currentTime)
    }
  }, [currentTime, durationSeconds])

  useEffect(() => {
    const previewMedia = previewMediaRef.current
    const guideAudio = guideAudioRef.current

    if (!previewMedia && !guideAudio) {
      return
    }

    if (isPlaying) {
      const playbackTime = currentTimeRef.current
      let didCancelPlaybackStart = false

      if (previewMedia && playbackTime < durationSeconds) {
        syncMediaElementTime(previewMedia, playbackTime, durationSeconds)
        const playPromise = previewMedia.play()

        playPromise.catch((error) => {
          if (!isAbortError(error)) {
            if (guideAudio) {
              previewMedia.pause()
              return
            }

            pausePlayback()
            return
          }

          window.requestAnimationFrame(() => {
            if (
              didCancelPlaybackStart ||
              currentTimeRef.current >= durationSeconds
            ) {
              return
            }

            previewMedia.play().catch(() => {
              pausePlayback()
            })
          })
        })
      }

      if (guideAudio) {
        syncMediaElementTime(guideAudio, playbackTime)
        const guideAudioPlayPromise = guideAudio.play()

        guideAudioPlayPromise.catch((error) => {
          // Audio-bed playback is optional in mock mode; source playback still drives time.
          if (!isAbortError(error)) {
            guideAudio.pause()
          }
        })
      }

      return () => {
        didCancelPlaybackStart = true
      }
    }

    previewMedia?.pause()
    guideAudio?.pause()
  }, [durationSeconds, isPlaying, pausePlayback])

  useEffect(() => {
    const previewMedia = previewMediaRef.current
    const guideAudio = guideAudioRef.current

    if (previewMedia) {
      previewMedia.muted = sourceTrackMuted
    }

    if (guideAudio) {
      guideAudio.muted = audioTrackMuted
    }
  }, [audioTrackMuted, sourceTrackMuted])

  useEffect(() => {
    if (!isPlaying || hasNativeMediaPreview) {
      return
    }

    const startedAt = performance.now()
    const playbackStartedAt = currentTimeRef.current
    const fallbackTimer = window.setInterval(() => {
      seekToTime(playbackStartedAt + (performance.now() - startedAt) / 1000)
    }, 250)

    return () => {
      window.clearInterval(fallbackTimer)
    }
  }, [hasNativeMediaPreview, isPlaying, seekToTime])

  useEffect(() => {
    const previewMedia = previewMediaRef.current
    const guideAudio = guideAudioRef.current

    if (!isPlaying || !hasNativeMediaPreview || (!previewMedia && !guideAudio)) {
      return
    }

    let animationFrameId = 0

    const syncPlaybackFrame = () => {
      const shouldUsePreviewClock =
        previewMedia &&
        !previewMedia.paused &&
        (!guideAudio || currentTimeRef.current < durationSeconds - 0.05)
      const shouldUseGuideAudioClock = guideAudio && !guideAudio.paused
      const playbackClock = shouldUsePreviewClock
        ? previewMedia
        : shouldUseGuideAudioClock
          ? guideAudio
          : previewMedia ?? guideAudio

      if (playbackClock) {
        seekToTime(playbackClock.currentTime)
      }

      animationFrameId = window.requestAnimationFrame(syncPlaybackFrame)
    }

    animationFrameId = window.requestAnimationFrame(syncPlaybackFrame)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [durationSeconds, hasNativeMediaPreview, isPlaying, seekToTime])

  return {
    setGuideAudioElement,
    setPreviewMediaElement,
  }
}
