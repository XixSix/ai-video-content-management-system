"use client"

import { Player, type CallbackListener, type PlayerRef } from "@remotion/player"
import { StudioPreviewComposition } from "@vidpilot/composition"
import { useQueries } from "@tanstack/react-query"
import { useEffect, useMemo, useRef } from "react"

import { mediaQueryKeys } from "@/features/media-library/hooks/media-query-keys"
import { mediaService } from "@/features/media-library/services/media.service"

import type { StudioEditorProject } from "../studio.types"
import {
  buildRenderDocumentFromStudioProject,
  clampPlaybackFrame,
  frameToSeconds,
  getRenderPreviewMediaIds,
  secondsToFrame,
} from "./render-document-adapter"

export function StudioRemotionPlayerPreview({
  currentTime,
  isPlaying,
  pausePlayback,
  project,
  seekToTime,
  mutedTrackIds,
  workspaceId,
}: {
  currentTime: number
  isPlaying: boolean
  mutedTrackIds: string[]
  pausePlayback: () => void
  project: StudioEditorProject
  seekToTime: (timeSeconds: number) => void
  workspaceId: string
}) {
  const playerRef = useRef<PlayerRef>(null)
  const playerOriginFrameRef = useRef<number | null>(null)
  const renderPreviewMediaIds = useMemo(
    () => getRenderPreviewMediaIds(project),
    [project]
  )
  const previewUrlQueries = useQueries({
    queries: renderPreviewMediaIds.map((mediaId) => ({
      queryKey: mediaQueryKeys.preview(workspaceId, mediaId),
      queryFn: () => mediaService.getPreviewUrl(workspaceId, mediaId),
      enabled: Boolean(workspaceId) && Boolean(mediaId),
      staleTime: 4 * 60 * 1000,
      retry: 1,
    })),
  })
  const mediaPreviewUrlById = useMemo(
    () =>
      Object.fromEntries(
        previewUrlQueries.flatMap((query, index) => {
          const url = query.data?.url

          return url ? [[renderPreviewMediaIds[index], url]] : []
        })
      ),
    [previewUrlQueries, renderPreviewMediaIds]
  )
  const renderDocument = useMemo(
    () =>
      buildRenderDocumentFromStudioProject(project, {
        mediaPreviewUrlById,
        mutedTrackIds,
      }),
    [mediaPreviewUrlById, mutedTrackIds, project]
  )

  useEffect(() => {
    const player = playerRef.current

    if (!player) {
      return
    }

    if (isPlaying) {
      player.play()
      return
    }

    player.pause()
  }, [isPlaying])

  useEffect(() => {
    const player = playerRef.current

    if (!player) {
      return
    }

    const targetFrame = clampPlaybackFrame(
      secondsToFrame(currentTime, renderDocument.fps),
      renderDocument.durationInFrames
    )
    const playerOriginFrame = playerOriginFrameRef.current

    if (
      playerOriginFrame !== null &&
      Math.abs(playerOriginFrame - targetFrame) <= 1
    ) {
      playerOriginFrameRef.current = null
      return
    }

    if (Math.abs(player.getCurrentFrame() - targetFrame) > 1) {
      player.seekTo(targetFrame)
    }
  }, [currentTime, renderDocument.durationInFrames, renderDocument.fps])

  useEffect(() => {
    const player = playerRef.current

    if (!player) {
      return
    }

    const handleTimeUpdate: CallbackListener<"timeupdate"> = (event) => {
      const frame = event.detail.frame
      playerOriginFrameRef.current = frame
      seekToTime(frameToSeconds(frame, renderDocument.fps))
    }
    const handleEnded: CallbackListener<"ended"> = () => {
      const endTime = frameToSeconds(
        renderDocument.durationInFrames,
        renderDocument.fps
      )

      playerOriginFrameRef.current = renderDocument.durationInFrames - 1
      seekToTime(endTime)
      pausePlayback()
    }

    player.addEventListener("timeupdate", handleTimeUpdate)
    player.addEventListener("ended", handleEnded)

    return () => {
      player.removeEventListener("timeupdate", handleTimeUpdate)
      player.removeEventListener("ended", handleEnded)
    }
  }, [
    pausePlayback,
    renderDocument.durationInFrames,
    renderDocument.fps,
    seekToTime,
  ])

  return (
    <Player
      ref={playerRef}
      component={StudioPreviewComposition}
      inputProps={renderDocument}
      durationInFrames={renderDocument.durationInFrames}
      compositionWidth={renderDocument.width}
      compositionHeight={renderDocument.height}
      fps={renderDocument.fps}
      controls={false}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
      moveToBeginningWhenEnded={false}
      acknowledgeRemotionLicense
      className="absolute inset-0 size-full"
      style={{
        height: "100%",
        width: "100%",
      }}
    />
  )
}
