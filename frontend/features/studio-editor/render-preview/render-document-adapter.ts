import type { RenderDocument } from "@vidpilot/composition/render-document"

import type {
  StudioAspectRatio,
  StudioCanvasLayer,
  StudioEditorProject,
  StudioProjectMediaItem,
  StudioTimelineSegment,
  StudioTimelineTrackId,
} from "../studio.types"
import {
  getProjectTimelineDuration,
  getTimelineSegmentDuration,
  getTimelineSegmentMedia,
  getTimelineSegmentStartTime,
} from "../timeline/lib/layout"
import {
  getLayerCanvasGeometry,
  getOverlaySegmentCanvasGeometry,
} from "../canvas/lib/geometry"

export const STUDIO_PREVIEW_FPS = 30

type RenderStyle = RenderDocument["textLayers"][number]["style"]
export type BuildRenderDocumentOptions = {
  mediaPreviewUrlById?: Record<string, string>
  mutedTrackIds?: string[]
}

export function secondsToFrame(
  seconds: number,
  fps: number = STUDIO_PREVIEW_FPS
) {
  return Math.max(0, Math.round(seconds * fps))
}

export function clampPlaybackFrame(frame: number, durationInFrames: number) {
  return Math.min(
    Math.max(0, Math.round(frame)),
    Math.max(0, durationInFrames - 1)
  )
}

export function frameToSeconds(
  frame: number,
  fps: number = STUDIO_PREVIEW_FPS
) {
  return Math.max(0, frame / fps)
}

function getCompositionDimensions(
  aspectRatio: StudioAspectRatio,
  fallback: {
    height: number
    width: number
  }
) {
  switch (aspectRatio) {
    case "1:1":
      return { width: 1080, height: 1080 }
    case "4:5":
      return { width: 1080, height: 1350 }
    case "16:9":
      return { width: 1920, height: 1080 }
    case "9:16":
      return { width: 1080, height: 1920 }
    default:
      return {
        width: Math.max(1, Math.round(fallback.width)),
        height: Math.max(1, Math.round(fallback.height)),
      }
  }
}

function getSourceMediaItem(project: StudioEditorProject) {
  return (
    project.projectMedia.find(
      (item) =>
        item.linkedSelectionId === project.sourceMedia.id ||
        item.origin === "SOURCE"
    ) ?? null
  )
}

export function getSourcePreviewMediaId(project: StudioEditorProject) {
  return getSourceMediaItem(project)?.id ?? project.media.id
}

function getMediaPreviewUrl(
  media: StudioProjectMediaItem | null,
  mediaPreviewUrlById: Record<string, string>
) {
  if (!media) {
    return ""
  }

  return mediaPreviewUrlById[media.id] || media.assetUrl || ""
}

function getSourcePreviewUrl(
  project: StudioEditorProject,
  mediaPreviewUrlById: Record<string, string>
) {
  const sourceMediaItem = getSourceMediaItem(project)

  return (
    mediaPreviewUrlById[getSourcePreviewMediaId(project)] ||
    project.media.streamUrl ||
    sourceMediaItem?.assetUrl ||
    ""
  )
}

function getTrackSegments(
  project: StudioEditorProject,
  trackId: StudioTimelineTrackId
) {
  return (
    project.timelineTracks.find((track) => track.id === trackId)?.segments ?? []
  )
}

function getLayerSegments(project: StudioEditorProject, layerId: string) {
  return getTrackSegments(project, "TEXT").filter(
    (segment) => segment.selectionId === layerId
  )
}

function getLayerTimingSegments(
  project: StudioEditorProject,
  layer: StudioCanvasLayer,
  durationInFrames: number
) {
  const segments = getLayerSegments(project, layer.id)

  if (segments.length > 0) {
    return segments
  }

  return [
    {
      id: `${layer.id}-full-duration`,
      label: layer.label,
      selectionId: layer.id,
      summary: layer.summary,
      tone: "muted" as const,
      widthClassName: "w-[100%]",
      startTime: 0,
      durationSeconds: frameToSeconds(durationInFrames),
    },
  ]
}

function getSegmentFrameTiming({
  durationInFrames,
  project,
  segment,
}: {
  durationInFrames: number
  project: StudioEditorProject
  segment: StudioTimelineSegment
}) {
  const media = getTimelineSegmentMedia({ project, segment })
  const startFrame = secondsToFrame(
    getTimelineSegmentStartTime({ media, segment })
  )
  const segmentDurationFrames = secondsToFrame(
    getTimelineSegmentDuration({
      media,
      projectDurationSeconds: project.media.durationSeconds,
      segment,
    })
  )

  return {
    startFrame,
    durationInFrames: Math.max(
      1,
      Math.min(segmentDurationFrames, Math.max(1, durationInFrames - startFrame))
    ),
  }
}

function getSegmentMedia({
  project,
  segment,
}: {
  project: StudioEditorProject
  segment: StudioTimelineSegment
}) {
  const directMedia = getTimelineSegmentMedia({ project, segment })

  if (directMedia) {
    return directMedia
  }

  const layer = project.layers.find((item) => item.id === segment.selectionId)

  if (!layer?.mediaId) {
    return null
  }

  return project.projectMedia.find((item) => item.id === layer.mediaId) ?? null
}

function compactStyle(style: Record<string, string | number | undefined>) {
  return Object.fromEntries(
    Object.entries(style).filter(
      (entry): entry is [string, string | number] => entry[1] !== undefined
    )
  )
}

function getFontFamilyValue(fontFamily?: StudioCanvasLayer["fontFamily"]) {
  const fontFamilyMap: Partial<Record<NonNullable<typeof fontFamily>, string>> = {
    anton: "var(--font-anton)",
    "bebas-neue": "var(--font-bebas-neue)",
    caveat: "var(--font-caveat)",
    geist: "var(--font-geist-sans)",
    montserrat: "var(--font-montserrat)",
    oswald: "var(--font-oswald)",
    "playfair-display": "var(--font-playfair-display)",
    poppins: "var(--font-poppins)",
    "roboto-mono": "var(--font-roboto-mono)",
    teko: "var(--font-teko)",
  }

  return fontFamily ? fontFamilyMap[fontFamily] : undefined
}

function getTextLayerStyle(layer: StudioCanvasLayer): RenderStyle {
  const backgroundColor =
    layer.backgroundStyle === "none" || layer.backgroundEnabled === false
      ? "transparent"
      : layer.backgroundColor

  return compactStyle({
    backgroundColor,
    borderRadius: layer.backgroundRadius,
    boxSizing: "border-box",
    color: layer.textColor,
    fontFamily: getFontFamilyValue(layer.fontFamily),
    fontSize: layer.fontSize,
    fontStyle: layer.fontStyle,
    fontWeight: layer.fontWeight === "bold" ? 700 : 500,
    lineHeight: 1.05,
    maxWidth: "100%",
    padding: backgroundColor && backgroundColor !== "transparent" ? "0.65em 0.8em" : undefined,
    textAlign: layer.textAlign,
    whiteSpace: "pre-wrap",
  })
}

function getCaptionLayerStyle(layer: StudioCanvasLayer): RenderStyle {
  const strokeWidth = layer.strokeEnabled
    ? `${layer.strokeWidth ?? 0}px ${layer.strokeColor ?? "#000000"}`
    : undefined
  const textShadow = layer.shadowEnabled
    ? layer.shadowStyle === "hard"
      ? "0 2px 0 rgba(0,0,0,0.45), 0 0 16px rgba(0,0,0,0.32)"
      : "0 1px 10px rgba(0,0,0,0.3)"
    : undefined

  return compactStyle({
    WebkitTextStroke: strokeWidth,
    backgroundColor:
      layer.backgroundEnabled === false ? "transparent" : layer.backgroundColor,
    borderRadius: layer.backgroundRadius,
    boxSizing: "border-box",
    color: layer.textColor,
    fontFamily: getFontFamilyValue(layer.fontFamily),
    fontSize: layer.fontSize,
    fontStyle: layer.fontStyle,
    fontWeight: layer.fontWeight === "bold" ? 700 : 500,
    lineHeight: 1.05,
    padding: layer.backgroundEnabled === false ? undefined : "0.35em 0.55em",
    textAlign: "center",
    textDecoration: layer.textDecoration,
    textShadow,
    textTransform: layer.textTransform,
  })
}

function isLayerVisible(layer: StudioCanvasLayer) {
  return layer.visible !== false && layer.enabled !== false
}

function getSourceTiming(
  project: StudioEditorProject,
  durationInFrames: number
) {
  const sourceSegment = getTrackSegments(project, "SOURCE")[0]

  if (!sourceSegment) {
    return {
      startFrame: 0,
      durationInFrames,
    }
  }

  return getSegmentFrameTiming({
    durationInFrames,
    project,
    segment: sourceSegment,
  })
}

function getCaptionText(text: string, index: number) {
  const visibleText = text.trim()

  if (!visibleText) {
    return ""
  }

  if (index === 0 || /^[.,!?;:]/.test(visibleText)) {
    return visibleText
  }

  return ` ${visibleText}`
}

function getCaptionEntries(project: StudioEditorProject) {
  return project.transcriptWords
    .filter((word) => word.text.trim().length > 0)
    .sort((left, right) => left.startTime - right.startTime)
    .map((word, index) => {
      const startMs = Math.max(0, Math.round(word.startTime * 1000))
      const endMs = Math.max(startMs + 1, Math.round(word.endTime * 1000))

      return {
        text: getCaptionText(word.text, index),
        startMs,
        endMs,
        timestampMs: startMs,
        confidence: word.confidence,
      }
    })
}

export function getRenderPreviewMediaIds(project: StudioEditorProject) {
  const ids = new Set<string>([getSourcePreviewMediaId(project)])

  for (const trackId of ["OVERLAY_MEDIA", "AUDIO"] as const) {
    for (const segment of getTrackSegments(project, trackId)) {
      const media = getSegmentMedia({ project, segment })

      if (media) {
        ids.add(media.id)
      }
    }
  }

  return Array.from(ids)
}

export function buildRenderDocumentFromStudioProject(
  project: StudioEditorProject,
  options: BuildRenderDocumentOptions = {}
): RenderDocument {
  const mediaPreviewUrlById = options.mediaPreviewUrlById ?? {}
  const mutedTrackIds = options.mutedTrackIds ?? []
  const timelineDurationSeconds = Math.max(0, getProjectTimelineDuration(project))
  const durationInFrames = Math.max(
    1,
    secondsToFrame(timelineDurationSeconds || project.media.durationSeconds || 1)
  )
  const dimensions = getCompositionDimensions(project.media.aspectRatio, {
    width: project.media.width,
    height: project.media.height,
  })
  const sourceTiming = getSourceTiming(project, durationInFrames)
  const captionEntries = getCaptionEntries(project)
  const overlayMediaLayers = getTrackSegments(project, "OVERLAY_MEDIA").flatMap(
    (segment) => {
      const media = getSegmentMedia({ project, segment })

      if (!media || (media.type !== "VIDEO" && media.type !== "IMAGE")) {
        return []
      }

      const timing = getSegmentFrameTiming({
        durationInFrames,
        project,
        segment,
      })
      const geometry = getOverlaySegmentCanvasGeometry(segment)

      return [
        {
          id: segment.id,
          src: getMediaPreviewUrl(media, mediaPreviewUrlById),
          mediaType: media.type,
          ...timing,
          fit: "contain" as const,
          muted: true,
          ...geometry,
          style: {},
        },
      ]
    }
  )
  const audioLayers = getTrackSegments(project, "AUDIO").flatMap((segment) => {
    const media = getSegmentMedia({ project, segment })

    if (!media || media.type !== "AUDIO") {
      return []
    }

    const timing = getSegmentFrameTiming({
      durationInFrames,
      project,
      segment,
    })

    return [
      {
        id: segment.id,
        src: getMediaPreviewUrl(media, mediaPreviewUrlById),
        ...timing,
        volume: 1,
        muted: mutedTrackIds.includes("AUDIO"),
      },
    ]
  })
  const textLayers = project.layers
    .filter((layer) => layer.kind === "text" && isLayerVisible(layer))
    .flatMap((layer) =>
      getLayerTimingSegments(project, layer, durationInFrames).map((segment) => {
        const timing = getSegmentFrameTiming({
          durationInFrames,
          project,
          segment,
        })
        const geometry = getLayerCanvasGeometry(layer)

        return {
          id: `${segment.id}-${layer.id}`,
          text: layer.content ?? layer.label,
          ...timing,
          ...geometry,
          style: getTextLayerStyle(layer),
        }
      })
    )
  const captionLayers = project.layers
    .filter((layer) => layer.kind === "captions" && isLayerVisible(layer))
    .filter(() => captionEntries.length > 0)
    .flatMap((layer) =>
      getLayerTimingSegments(project, layer, durationInFrames).map((segment) => {
        const timing = getSegmentFrameTiming({
          durationInFrames,
          project,
          segment,
        })
        const geometry = getLayerCanvasGeometry(layer)

        return {
          id: `${segment.id}-${layer.id}`,
          ...timing,
          ...geometry,
          captions: captionEntries,
          style: getCaptionLayerStyle(layer),
        }
      })
    )

  return {
    version: 1,
    ...dimensions,
    fps: STUDIO_PREVIEW_FPS,
    durationInFrames,
    backgroundColor: "#000000",
    sourceVideo: {
      src: getSourcePreviewUrl(project, mediaPreviewUrlById),
      ...sourceTiming,
      fit: "cover",
      muted: mutedTrackIds.includes("SOURCE"),
    },
    overlayMediaLayers,
    audioLayers,
    textLayers,
    captionLayers,
  }
}
