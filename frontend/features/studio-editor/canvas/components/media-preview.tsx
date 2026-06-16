import Image from "next/image"

import type {
  StudioMediaDetail,
  StudioProjectMediaItem,
} from "../../studio.types"
import { CanvasFallbackArtwork } from "./fallback-artwork"

export function MediaPreview({
  audioTrackMuted,
  currentTime,
  guideAudioItem,
  media,
  onGuideAudioElement,
  onPreviewMediaElement,
  pausePlayback,
  seekToTime,
  sourceTrackMuted,
}: {
  audioTrackMuted: boolean
  currentTime: number
  guideAudioItem: StudioProjectMediaItem | null
  media: StudioMediaDetail
  onGuideAudioElement: (element: HTMLAudioElement | null) => void
  onPreviewMediaElement: (
    element: HTMLVideoElement | HTMLAudioElement | null
  ) => void
  pausePlayback: () => void
  seekToTime: (timeSeconds: number) => void
  sourceTrackMuted: boolean
}) {
  return (
    <>
      {media.type === "VIDEO" && media.streamUrl ? (
        <video
          ref={onPreviewMediaElement}
          src={media.streamUrl}
          poster={media.thumbnailUrl ?? undefined}
          playsInline
          muted={sourceTrackMuted}
          preload="metadata"
          onEnded={() => {
            if (!guideAudioItem?.assetUrl) {
              pausePlayback()
              seekToTime(media.durationSeconds)
            }
          }}
          onTimeUpdate={(event) => {
            if (currentTime <= media.durationSeconds) {
              seekToTime(event.currentTarget.currentTime)
            }
          }}
          className="absolute inset-0 size-full object-contain"
        />
      ) : media.type === "AUDIO" && media.streamUrl ? (
        <>
          {media.thumbnailUrl ? (
            <Image
              src={media.thumbnailUrl}
              alt=""
              fill
              sizes="70vw"
              className="absolute inset-0 object-contain"
              priority
            />
          ) : null}
          <audio
            ref={onPreviewMediaElement}
            src={media.streamUrl}
            muted={sourceTrackMuted}
            preload="metadata"
            onEnded={() => {
              if (!guideAudioItem?.assetUrl) {
                pausePlayback()
                seekToTime(media.durationSeconds)
              }
            }}
            onTimeUpdate={(event) => {
              if (currentTime <= media.durationSeconds) {
                seekToTime(event.currentTarget.currentTime)
              }
            }}
          />
        </>
      ) : media.thumbnailUrl ? (
        <Image
          src={media.thumbnailUrl}
          alt=""
          fill
          sizes="70vw"
          className="absolute inset-0 object-contain"
          priority
        />
      ) : (
        <CanvasFallbackArtwork />
      )}

      {guideAudioItem?.assetUrl ? (
        <audio
          ref={onGuideAudioElement}
          src={guideAudioItem.assetUrl}
          muted={audioTrackMuted}
          preload="metadata"
          onEnded={() => {
            pausePlayback()
            seekToTime(Math.max(currentTime, media.durationSeconds))
          }}
        />
      ) : null}
    </>
  )
}
