"use client"

import { useMemo, useState } from "react"

import { getAspectRatioValue } from "@/features/studio-editor/lib/aspect-ratio"
import { buildCaptionCues } from "@/features/studio-editor/lib/caption-cues"
import {
  useStudioLayerActions,
  useStudioPlaybackState,
  useStudioProjectState,
  useStudioSelectionState,
  useStudioTimelineActions,
  useStudioToolState,
} from "@/features/studio-editor/store/studio-editor-store"
import type { StudioCanvasLayer } from "@/features/studio-editor/studio.types"
import { cn } from "@/lib/utils"

import { EditorOverlayLayerList } from "./components/editor-overlay-layer-list"
import { usePreviewSize } from "./hooks/use-preview-size"
import type { ActiveCompositionSegment } from "./lib/composition"
import { resolveCompositionFrame } from "./lib/composition"
import { useEditorRouteParams } from "../hooks/use-editor-route-params"
import { StudioRemotionPlayerPreview } from "../render-preview/studio-remotion-player-preview"

export function StudioCanvas() {
  const { workspaceId } = useEditorRouteParams()
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
  const { updateCanvasLayerGeometry } = useStudioLayerActions()
  const { updateTimelineSegmentGeometry } = useStudioTimelineActions()
  const { selectedItemId, selectedTargetId, setSelectedItemId } =
    useStudioSelectionState()
  const { setActiveTool } = useStudioToolState()
  const canvasAspectRatio = getAspectRatioValue(project.media.aspectRatio)
  const { canvasAreaRef, previewSize } = usePreviewSize(canvasAspectRatio)
  const isSourceSelected = selectedTargetId === project.sourceMedia.id
  const compositionFrame = useMemo(
    () => resolveCompositionFrame(project, currentTime),
    [currentTime, project]
  )

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
  const handleSelectOverlaySegment = (overlay: ActiveCompositionSegment) => {
    setActiveTool("media")
    setSelectedItemId(overlay.segment.id)
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
            <StudioRemotionPlayerPreview
              currentTime={currentTime}
              isPlaying={isPlaying}
              mutedTrackIds={mutedTrackIds}
              pausePlayback={pausePlayback}
              project={project}
              seekToTime={seekToTime}
              workspaceId={workspaceId}
            />

            <EditorOverlayLayerList
              captionCues={captionCues}
              compositionFrame={compositionFrame}
              currentTime={currentTime}
              layers={project.layers}
              onLayerDragGuideChange={setLayerDragGuide}
              onLayerGeometryChange={updateCanvasLayerGeometry}
              onSelectLayer={handleSelectLayer}
              onSelectOverlaySegment={handleSelectOverlaySegment}
              onSegmentGeometryChange={updateTimelineSegmentGeometry}
              selectedItemId={selectedItemId}
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

          </div>
        </div>
      </div>
    </section>
  )
}
