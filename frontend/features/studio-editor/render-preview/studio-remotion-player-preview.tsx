"use client"

import { Player, type CallbackListener, type PlayerRef } from "@remotion/player"
import { StudioPreviewComposition } from "@vidpilot/composition"
import { useEffect, useMemo, useRef } from "react"

import { useMediaPreviewUrl } from "@/features/media-library/hooks/use-media-mutations"

import type { StudioEditorProject } from "../studio.types"
import {
  buildRenderDocumentFromStudioProject,
  clampPlaybackFrame,
  frameToSeconds,
  getSourcePreviewMediaId,
  secondsToFrame,
} from "./render-document-adapter"

export function StudioRemotionPlayerPreview({
  currentTime,
  isPlaying,
  pausePlayback,
  project,
  seekToTime,
  sourceMuted,
  workspaceId,
}: {
  currentTime: number
  isPlaying: boolean
  pausePlayback: () => void
  project: StudioEditorProject
  seekToTime: (timeSeconds: number) => void
  sourceMuted: boolean
  workspaceId: string
}) {
  const playerRef = useRef<PlayerRef>(null)
  const playerOriginFrameRef = useRef<number | null>(null)
  const baseDocument = useMemo(
    () => buildRenderDocumentFromStudioProject(project),
    [project]
  )
  const sourceMediaId = useMemo(
    () => getSourcePreviewMediaId(project),
    [project]
  )
  const previewUrlQuery = useMediaPreviewUrl(
    workspaceId,
    sourceMediaId,
    !baseDocument.sourceVideo.src
  )
  const sourcePreviewUrl =
    baseDocument.sourceVideo.src || previewUrlQuery.data?.url || ""
  const renderDocument = useMemo(
    () => ({
      ...baseDocument,
      sourceVideo: {
        ...baseDocument.sourceVideo,
        muted: sourceMuted,
        src: sourcePreviewUrl,
      },
    }),
    [baseDocument, sourceMuted, sourcePreviewUrl]
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
