"use client"

import { useCallback, useEffect, useRef } from "react"

import { useMediaPreviewUrl } from "@/features/media-library/hooks/use-media-mutations"

import type { StudioMediaDetail } from "../../studio.types"
import type { ActiveCompositionSegment } from "../lib/composition"
import { useSyncedCompositionMedia } from "../hooks/use-composition-playback"

function useCompositionPreviewUrl(
  workspaceId: string,
  mediaId: string | null,
  existingUrl?: string | null
) {
  const query = useMediaPreviewUrl(workspaceId, mediaId, !existingUrl)
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
  onEnded,
  onLocalTimeChange,
  onPause,
  onPlay,
  source,
  sourceDetail,
  workspaceId,
}: {
  isPlaying: boolean
  muted: boolean
  onEnded: () => void
  onLocalTimeChange: (timeSeconds: number) => void
  onPause: () => void
  onPlay: () => void
  source: ActiveCompositionSegment
  sourceDetail: StudioMediaDetail
  workspaceId: string
}) {
  const mediaId = source.media?.id ?? sourceDetail.id
  const mediaType = source.media?.type ?? sourceDetail.type
  const { previewUrl, retryPreview } = useCompositionPreviewUrl(
    workspaceId,
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
        onEnded={onEnded}
        onPause={onPause}
        onPlay={onPlay}
        onTimeUpdate={(event) => {
          onLocalTimeChange(event.currentTarget.currentTime)
        }}
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
      onEnded={onEnded}
      onPause={onPause}
      onPlay={onPlay}
      onTimeUpdate={(event) => {
        onLocalTimeChange(event.currentTarget.currentTime)
      }}
    />
  )
}

export function CanvasOverlayMedia({
  isPlaying,
  muted,
  onSelect,
  overlay,
  workspaceId,
}: {
  isPlaying: boolean
  muted: boolean
  onSelect: () => void
  overlay: ActiveCompositionSegment
  workspaceId: string
}) {
  const media = overlay.media
  const { previewUrl, retryPreview } = useCompositionPreviewUrl(
    workspaceId,
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
  workspaceId,
}: {
  audio: ActiveCompositionSegment
  isPlaying: boolean
  muted: boolean
  workspaceId: string
}) {
  const media = audio.media
  const { previewUrl, retryPreview } = useCompositionPreviewUrl(
    workspaceId,
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
