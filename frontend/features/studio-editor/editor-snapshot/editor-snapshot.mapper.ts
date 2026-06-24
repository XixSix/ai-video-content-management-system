import { formatDuration } from "@/features/media-library/media-library.utils"
import type {
  ProjectDetail,
  ProjectMedia,
  ProjectMediaSummary,
} from "@/features/studio-hub/studio-projects.types"

import { studioEditorProject } from "../data/project.mock"
import { cloneProject } from "../store/studio-editor-state"
import type {
  StudioAspectRatio,
  StudioCanvasLayer,
  StudioEditorProject,
  StudioProjectMediaItem,
  StudioTimelineSegment,
  StudioTimelineTrack,
  StudioTimelineTrackId,
} from "../studio.types"
import {
  getLayerCanvasGeometry,
  getOverlaySegmentCanvasGeometry,
} from "../canvas/lib/geometry"
import { getTimelineWidthClassName } from "../timeline/lib/operations"
import type { EditorDocument } from "./editor-snapshot.schema"

const TRACK_ORDER: StudioTimelineTrackId[] = [
  "TEXT",
  "OVERLAY_MEDIA",
  "SOURCE",
  "AUDIO",
]

const TRACK_LABELS: Record<StudioTimelineTrackId, string> = {
  TEXT: "Text",
  OVERLAY_MEDIA: "Images",
  SOURCE: "Source",
  AUDIO: "Audio",
}

const LAYER_STYLE_KEYS = [
  "animationBy",
  "animationDuration",
  "animationName",
  "backgroundEnabled",
  "backgroundColor",
  "backgroundRadius",
  "backgroundStyle",
  "boxWidth",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "highlightColor",
  "highlightEnabled",
  "presetId",
  "shadowEnabled",
  "shadowStyle",
  "strokeColor",
  "strokeEnabled",
  "strokeWidth",
  "textAlign",
  "textColor",
  "textDecoration",
  "textTransform",
] as const satisfies readonly (keyof StudioCanvasLayer)[]

function isAspectRatio(value: string): value is StudioAspectRatio {
  return ["9:16", "1:1", "4:5", "16:9"].includes(value)
}

function isUuid(value: string | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
      )
  )
}

function getFormatLabel(mimeType: string | null) {
  if (!mimeType) {
    return "FILE"
  }

  return (mimeType.split("/")[1] ?? mimeType).split(";")[0].toUpperCase()
}

function getResolutionLabel(media: ProjectMediaSummary) {
  return media.width && media.height
    ? `${media.width}x${media.height}`
    : undefined
}

function getProjectMediaStatus(
  status: ProjectMediaSummary["status"]
): StudioProjectMediaItem["status"] {
  if (status === "UPLOADED") return "READY"
  if (status === "UPLOADING") return "PROCESSING"
  return "FAILED"
}

export function mapProjectMediaToStudioItem(
  item: ProjectMedia
): StudioProjectMediaItem {
  const media = item.media
  const durationLabel =
    media.duration !== null ? formatDuration(media.duration) : undefined
  const resolutionLabel = getResolutionLabel(media)

  return {
    id: media.id,
    projectMediaId: item.id,
    type: media.type,
    name: media.title ?? media.originalFilename,
    summary: `${item.role.replaceAll("_", " ").toLowerCase()} project media.`,
    origin: item.role === "SOURCE" ? "SOURCE" : "LIBRARY",
    status: getProjectMediaStatus(media.status),
    assetUrl: null,
    thumbnailUrl: null,
    format: getFormatLabel(media.mimeType),
    metadata: [durationLabel, resolutionLabel].filter(Boolean).join(" · "),
    usageLabel: item.role.replaceAll("_", " "),
    durationSeconds: media.duration ?? undefined,
    durationLabel,
    resolutionLabel,
    dimensionsLabel: media.type === "IMAGE" ? resolutionLabel : undefined,
    linkedSelectionId: item.role === "SOURCE" ? media.id : undefined,
    sourceLibraryItemId: media.id,
    startTime: item.role === "SOURCE" ? 0 : undefined,
  }
}

export function createStudioProjectFromDetail(
  detail: ProjectDetail
): StudioEditorProject {
  const project = cloneProject(studioEditorProject)
  const sourceMedia = detail.sourceMedia
  const durationSeconds = detail.duration ?? sourceMedia?.duration ?? 0
  const aspectRatio = isAspectRatio(detail.aspectRatio)
    ? detail.aspectRatio
    : project.media.aspectRatio
  const sourceId = sourceMedia?.id ?? `project-${detail.id}-source`
  const sourceName =
    sourceMedia?.title ?? sourceMedia?.originalFilename ?? "No source media"
  const projectMedia = detail.projectMedia.map(mapProjectMediaToStudioItem)

  return {
    ...project,
    media: {
      ...project.media,
      id: sourceId,
      title: sourceName,
      aspectRatio,
      durationSeconds,
      durationLabel: formatDuration(durationSeconds),
      status:
        sourceMedia?.status === "UPLOADED"
          ? "UPLOADED"
          : sourceMedia?.status === "UPLOADING"
            ? "PROCESSING"
            : "FAILED",
      type: sourceMedia?.type === "AUDIO" ? "AUDIO" : "VIDEO",
      width: sourceMedia?.width ?? project.media.width,
      height: sourceMedia?.height ?? project.media.height,
      streamUrl: "",
      thumbnailUrl: "",
    },
    projectMedia,
    sourceMedia: {
      id: sourceId,
      name: sourceMedia?.originalFilename ?? sourceName,
      durationLabel: formatDuration(durationSeconds),
      resolutionLabel: sourceMedia
        ? getResolutionLabel(sourceMedia) ?? "Source media"
        : "No source media",
      summary: sourceName,
      thumbnailUrl: null,
    },
    layers: [],
    timelineTracks: [],
  }
}

export function createDefaultEditorDocument(
  detail: ProjectDetail
): EditorDocument {
  const durationSeconds = detail.duration ?? detail.sourceMedia?.duration ?? 0
  const sourceMediaId = detail.sourceMedia?.id

  return {
    schemaVersion: 1,
    settings: {
      aspectRatio: isAspectRatio(detail.aspectRatio)
        ? detail.aspectRatio
        : "9:16",
    },
    layers: [],
    timelineTracks: TRACK_ORDER.map((id) => ({
      id,
      segments:
        id === "SOURCE" &&
        isUuid(sourceMediaId) &&
        durationSeconds > 0
          ? [
              {
                id: `source-${sourceMediaId}`,
                mediaId: sourceMediaId,
                startTime: 0,
                durationSeconds,
              },
            ]
          : [],
    })),
  }
}

function getLayerStyle(layer: StudioCanvasLayer) {
  return Object.fromEntries(
    LAYER_STYLE_KEYS.flatMap((key) => {
      const value = layer[key]
      return value === undefined ? [] : [[key, value]]
    })
  )
}

function toEditorLayer(
  layer: StudioCanvasLayer
): EditorDocument["layers"][number] | null {
  const base = {
    id: layer.id,
    visible:
      layer.visible ??
      (layer.kind === "captions" ? layer.enabled !== false : true),
    ...getLayerCanvasGeometry(layer),
    style: getLayerStyle(layer),
  }

  if (layer.kind === "text") {
    return {
      ...base,
      kind: "text",
      content: layer.content ?? "",
    }
  }

  if (layer.kind === "captions") {
    return {
      ...base,
      kind: "captions",
    }
  }

  if (!isUuid(layer.mediaId)) {
    return null
  }

  return {
    ...base,
    kind: "image",
    mediaId: layer.mediaId,
  }
}

function getSegmentReference(
  project: StudioEditorProject,
  segment: StudioTimelineSegment
) {
  const layer = project.layers.find(
    (item) => item.id === segment.selectionId
  )

  if (layer) {
    return { layerId: layer.id }
  }

  const media = project.projectMedia.find(
    (item) =>
      item.id === segment.selectionId ||
      item.linkedSelectionId === segment.selectionId
  )
  const mediaId =
    media?.id ??
    (segment.selectionId === project.sourceMedia.id
      ? project.media.id
      : undefined)

  return isUuid(mediaId) ? { mediaId } : null
}

export function serializeEditorDocument(
  project: StudioEditorProject
): EditorDocument {
  const layers = project.layers
    .map(toEditorLayer)
    .filter((layer): layer is NonNullable<typeof layer> => layer !== null)
  const persistedLayerIds = new Set(layers.map((layer) => layer.id))

  return {
    schemaVersion: 1,
    settings: {
      aspectRatio: project.media.aspectRatio,
    },
    layers,
    timelineTracks: TRACK_ORDER.map((trackId) => {
      const track = project.timelineTracks.find((item) => item.id === trackId)
      const segments = (track?.segments ?? []).flatMap((segment) => {
        const reference = getSegmentReference(project, segment)

        if (
          !reference ||
          ("layerId" in reference &&
            reference.layerId !== undefined &&
            !persistedLayerIds.has(reference.layerId))
        ) {
          return []
        }

        return [
          {
            id: segment.id,
            ...reference,
            startTime: Math.max(0, segment.startTime ?? 0),
            durationSeconds: Math.max(0.25, segment.durationSeconds ?? 0.25),
            ...(trackId === "OVERLAY_MEDIA"
              ? getOverlaySegmentCanvasGeometry(segment)
              : {}),
            ...(segment.laneIndex === undefined
              ? {}
              : { laneIndex: segment.laneIndex }),
          },
        ]
      })

      return {
        id: trackId,
        segments,
      }
    }),
  }
}

function getLayerPresentation(
  layer: EditorDocument["layers"][number]
): Pick<
  StudioCanvasLayer,
  "className" | "frameClassName" | "label" | "summary"
> {
  if (layer.kind === "captions") {
    return {
      label: "Captions",
      summary: "Caption layer",
      className:
        "absolute rounded-2xl px-4 py-3 text-center shadow-xl transition",
      frameClassName:
        "absolute inset-x-[12%] bottom-[7.5%] h-[15%] rounded-[28px] border border-sky-300/90",
    }
  }

  if (layer.kind === "image") {
    return {
      label: "Image overlay",
      summary: "Image layer",
      className:
        "absolute left-[10%] top-[10%] rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white",
      frameClassName:
        "absolute left-[10%] top-[10%] h-[24%] w-[34%] rounded-xl border border-sky-300/90",
    }
  }

  return {
    label: layer.content || "Text",
    summary: "Text layer",
    className:
      "absolute max-w-[80%] rounded-xl px-4 py-3 leading-tight shadow-xl transition",
    frameClassName:
      "absolute h-[18%] w-[46%] rounded-2xl border border-sky-300/90",
  }
}

function hydrateLayer(
  layer: EditorDocument["layers"][number]
): StudioCanvasLayer {
  const presentation = getLayerPresentation(layer)
  const style = layer.style as Partial<StudioCanvasLayer>

  return {
    id: layer.id,
    kind: layer.kind,
    ...presentation,
    ...style,
    ...(layer.kind === "text" ? { content: layer.content } : {}),
    ...(layer.kind === "image" ? { mediaId: layer.mediaId } : {}),
    ...(layer.kind === "captions" ? { enabled: layer.visible } : {}),
    visible: layer.visible,
    ...getLayerCanvasGeometry({
      id: layer.id,
      kind: layer.kind,
      ...presentation,
      ...style,
      visible: layer.visible,
      widthPercent: layer.widthPercent,
      heightPercent: layer.heightPercent,
      xPercent: layer.xPercent,
      yPercent: layer.yPercent,
    } as StudioCanvasLayer),
  }
}

function getSegmentDisplay(
  project: StudioEditorProject,
  document: EditorDocument,
  segment: EditorDocument["timelineTracks"][number]["segments"][number]
) {
  const layer = segment.layerId
    ? document.layers.find((item) => item.id === segment.layerId)
    : null
  const media = segment.mediaId
    ? project.projectMedia.find((item) => item.id === segment.mediaId)
    : null

  return {
    label:
      layer?.kind === "text"
        ? layer.content || "Text"
        : layer?.kind === "captions"
          ? "Captions"
          : media?.name ?? "Media",
    summary: layer
      ? `${layer.kind} layer timing`
      : media?.summary ?? "Project media timing",
  }
}

export function hydrateEditorDocument(
  baseProject: StudioEditorProject,
  document: EditorDocument
): StudioEditorProject {
  const project = {
    ...baseProject,
    media: {
      ...baseProject.media,
      aspectRatio: document.settings.aspectRatio,
    },
    layers: document.layers.map(hydrateLayer),
  }

  const timelineTracks: StudioTimelineTrack[] = TRACK_ORDER.map((id) => {
    const persistedTrack = document.timelineTracks.find(
      (track) => track.id === id
    )
    const segments = (persistedTrack?.segments ?? []).map((segment) => {
      const selectionId = segment.layerId ?? segment.mediaId
      const display = getSegmentDisplay(project, document, segment)

      return {
        id: segment.id,
        ...display,
        durationSeconds: segment.durationSeconds,
        laneIndex: segment.laneIndex,
        selectionId: selectionId!,
        startTime: segment.startTime,
        tone:
          id === "TEXT" || id === "OVERLAY_MEDIA"
            ? ("muted" as const)
            : ("base" as const),
        widthClassName: getTimelineWidthClassName(
          segment.durationSeconds,
          project.media.durationSeconds
        ),
        ...(id === "OVERLAY_MEDIA"
          ? getOverlaySegmentCanvasGeometry({
              id: segment.id,
              label: display.label,
              durationSeconds: segment.durationSeconds,
              laneIndex: segment.laneIndex,
              selectionId: selectionId!,
              startTime: segment.startTime,
              summary: display.summary,
              tone: "muted",
              widthClassName: getTimelineWidthClassName(
                segment.durationSeconds,
                project.media.durationSeconds
              ),
              widthPercent: segment.widthPercent,
              heightPercent: segment.heightPercent,
              xPercent: segment.xPercent,
              yPercent: segment.yPercent,
            })
          : {}),
      }
    })

    return {
      id,
      label: TRACK_LABELS[id],
      selectionId:
        segments[0]?.selectionId ??
        (id === "SOURCE" ? project.sourceMedia.id : id),
      segments,
    }
  })

  return {
    ...project,
    timelineTracks,
  }
}

export function getEditorDocumentFingerprint(document: EditorDocument) {
  return JSON.stringify(document)
}
