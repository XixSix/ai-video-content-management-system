"use client"

import { useMemo, useState } from "react"

import { getAspectRatioValue } from "@/features/studio-editor/lib/aspect-ratio"
import { buildCaptionCues } from "@/features/studio-editor/lib/caption-cues"
import {
  useStudioLayerActions,
  useStudioPlaybackState,
  useStudioProjectState,
  useStudioSelectionState,
  useStudioToolState,
} from "@/features/studio-editor/store/studio-editor-store"
import type { StudioCanvasLayer } from "@/features/studio-editor/studio.types"
import { cn } from "@/lib/utils"

import { CanvasLayerList } from "./components/canvas-layer-list"
import { MediaPreview } from "./components/media-preview"
import { CanvasSelectionFrame } from "./components/selection-frame"
import { useCanvasMediaSync } from "./hooks/use-canvas-media-sync"
import { usePreviewSize } from "./hooks/use-preview-size"

export function StudioCanvas() {
  const [layerDragGuide, setLayerDragGuide] = useState<{
    horizontal: boolean
    vertical: boolean
  } | null>(null)
  const {
    currentTime,
    isPlaying,
    mutedTrackIds,
    pausePlayback,
    seekToTime,
  } = useStudioPlaybackState()
  const { project } = useStudioProjectState()
  const { updateCanvasLayerPosition } = useStudioLayerActions()
  const { selectedItem, selectedTargetId, setSelectedItemId } =
    useStudioSelectionState()
  const { setActiveTool } = useStudioToolState()
  const canvasAspectRatio = getAspectRatioValue(project.media.aspectRatio)
  const { canvasAreaRef, previewSize } = usePreviewSize(canvasAspectRatio)
  const isSourceSelected = selectedTargetId === project.sourceMedia.id
  const hasNativeMediaPreview = Boolean(project.media.streamUrl)
  const guideAudioItem = useMemo(
    () =>
      project.projectMedia.find((item) => item.linkedSelectionId === "audio-bed") ??
      null,
    [project.projectMedia]
  )
  const sourceTrackMuted = mutedTrackIds.includes("SOURCE")
  const audioTrackMuted = mutedTrackIds.includes("AUDIO")
  const { setGuideAudioElement, setPreviewMediaElement } = useCanvasMediaSync({
    audioTrackMuted,
    currentTime,
    durationSeconds: project.media.durationSeconds,
    hasNativeMediaPreview,
    isPlaying,
    pausePlayback,
    seekToTime,
    sourceTrackMuted,
  })

  const captionCues = useMemo(
    () => buildCaptionCues(project.transcriptSegments, project.transcriptWords),
    [project.transcriptSegments, project.transcriptWords]
  )

  const handleSelectLayer = (layer: StudioCanvasLayer) => {
    setActiveTool(
      layer.kind === "text"
        ? "text"
        : layer.kind === "captions"
          ? "captions"
          : "assets"
    )
    setSelectedItemId(layer.id)
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(125,125,125,0.1),transparent_42%),linear-gradient(180deg,color-mix(in_srgb,var(--background)_92%,black_8%),var(--background))]">
      <div
        ref={canvasAreaRef}
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-7 py-6"
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <div
            data-studio-canvas-preview=""
            onClick={() => {
              setActiveTool("media")
              setSelectedItemId(project.sourceMedia.id)
            }}
            className={cn(
              "relative max-h-full max-w-full overflow-hidden rounded-xl border border-black bg-black shadow-[0_40px_100px_-40px_rgba(0,0,0,0.7)]",
              isSourceSelected ? "ring-2 ring-sky-300/75 ring-offset-0" : null
            )}
            style={{
              aspectRatio: canvasAspectRatio,
              height: previewSize?.height,
              width: previewSize?.width ?? "100%",
            }}
          >
            <MediaPreview
              audioTrackMuted={audioTrackMuted}
              currentTime={currentTime}
              guideAudioItem={guideAudioItem}
              media={project.media}
              onGuideAudioElement={setGuideAudioElement}
              onPreviewMediaElement={setPreviewMediaElement}
              pausePlayback={pausePlayback}
              seekToTime={seekToTime}
              sourceTrackMuted={sourceTrackMuted}
            />

            <CanvasLayerList
              captionCues={captionCues}
              currentTime={currentTime}
              layers={project.layers}
              onLayerDragGuideChange={setLayerDragGuide}
              onMoveLayer={updateCanvasLayerPosition}
              onSelectLayer={handleSelectLayer}
              selectedTargetId={selectedTargetId}
            />

            {layerDragGuide ? (
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-40">
                {layerDragGuide.vertical ? (
                  <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 border-l border-dashed border-sky-300/85 shadow-[0_0_12px_rgba(125,211,252,0.35)]" />
                ) : null}
                {layerDragGuide.horizontal ? (
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-sky-300/85 shadow-[0_0_12px_rgba(125,211,252,0.35)]" />
                ) : null}
              </div>
            ) : null}

            <CanvasSelectionFrame
              layers={project.layers}
              selectedItem={selectedItem}
              selectedTargetId={selectedTargetId}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
