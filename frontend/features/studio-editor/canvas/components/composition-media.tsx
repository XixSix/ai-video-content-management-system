"use client"

import { useCallback, useEffect, useRef } from "react"

import { useMediaPreviewUrl } from "@/features/media-library/hooks/use-media-mutations"

import type { StudioMediaDetail } from "../../studio.types"
import type { ActiveCompositionSegment } from "../lib/composition"
import { useSyncedCompositionMedia } from "../hooks/use-composition-playback"

function useCompositionPreviewUrl(
  mediaId: string | null,
  existingUrl?: string | null
) {
  const query = useMediaPreviewUrl(mediaId, !existingUrl)
  const retryRef = useRef(false)
  const refetch = query.refetch

  useEffect(() => {
    retryRef.current = false
  }, [query.data?.url])

  return {
    previewUrl: existingUrl || query.data?.url || "",
    retryPreview: useCallback(() => {
      if (!retryRef.current) {
        retryRef.current = true
        void refetch()
      }
    }, [refetch]),
  }
}

export function CanvasSourceMedia({
  isPlaying,
  muted,
  source,
  sourceDetail,
}: {
  isPlaying: boolean
  muted: boolean
  source: ActiveCompositionSegment
  sourceDetail: StudioMediaDetail
}) {
  const mediaId = source.media?.id ?? sourceDetail.id
  const mediaType = source.media?.type ?? sourceDetail.type
  const { previewUrl, retryPreview } = useCompositionPreviewUrl(
    mediaId,
    sourceDetail.streamUrl
  )
  const setMediaElement = useSyncedCompositionMedia({
    isPlaying,
    localTime: source.localTime,
    muted,
    onPlaybackError: retryPreview,
  })

  if (!previewUrl) return null

  if (mediaType === "VIDEO") {
    return (
      <video
        ref={setMediaElement}
        src={previewUrl}
        muted={muted}
        playsInline
        preload="metadata"
        onError={retryPreview}
        className="absolute inset-0 z-0 size-full object-contain"
      />
    )
  }

  return (
    <audio
      ref={setMediaElement}
      src={previewUrl}
      muted={muted}
      preload="metadata"
      onError={retryPreview}
    />
  )
}

export function CanvasOverlayMedia({
  isPlaying,
  muted,
  onSelect,
  overlay,
}: {
  isPlaying: boolean
  muted: boolean
  onSelect: () => void
  overlay: ActiveCompositionSegment
}) {
  const media = overlay.media
  const { previewUrl, retryPreview } = useCompositionPreviewUrl(
    media?.id ?? null,
    media?.assetUrl
  )
  const setMediaElement = useSyncedCompositionMedia({
    isPlaying,
    localTime: overlay.localTime,
    muted,
    onPlaybackError: retryPreview,
  })

  if (!media || !previewUrl) return null

  return (
    <button
      type="button"
      aria-label={`Select ${media.name}`}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
    >
      {media.type === "VIDEO" ? (
        <video
          ref={setMediaElement}
          src={previewUrl}
          muted={muted}
          playsInline
          preload="metadata"
          onError={retryPreview}
          className="pointer-events-none size-full object-contain"
        />
      ) : media.type === "IMAGE" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          onError={retryPreview}
          className="pointer-events-none size-full object-contain"
        />
      ) : null}
    </button>
  )
}

export function CanvasAudioMedia({
  audio,
  isPlaying,
  muted,
}: {
  audio: ActiveCompositionSegment
  isPlaying: boolean
  muted: boolean
}) {
  const media = audio.media
  const { previewUrl, retryPreview } = useCompositionPreviewUrl(
    media?.id ?? null,
    media?.assetUrl
  )
  const setMediaElement = useSyncedCompositionMedia({
    isPlaying,
    localTime: audio.localTime,
    muted,
    onPlaybackError: retryPreview,
  })

  if (!media || !previewUrl) return null

  return (
    <audio
      ref={setMediaElement}
      src={previewUrl}
      muted={muted}
      preload="metadata"
      onError={retryPreview}
    />
  )
}
