import type {
  StudioCanvasLayer,
  StudioTimelineSegment,
} from "../../studio.types"

export type StudioCanvasGeometry = {
  heightPercent: number
  widthPercent: number
  xPercent: number
  yPercent: number
}

export type StudioGeometryKind = "captions" | "overlay" | "text"

const MIN_GEOMETRY_SIZE_PERCENT = 6

export const STUDIO_CANVAS_GEOMETRY_DEFAULTS = {
  captions: {
    xPercent: 50,
    yPercent: 82,
    widthPercent: 76,
    heightPercent: 15,
  },
  overlay: {
    xPercent: 50,
    yPercent: 50,
    widthPercent: 70,
    heightPercent: 40,
  },
  text: {
    xPercent: 50,
    yPercent: 50,
    widthPercent: 46,
    heightPercent: 18,
  },
} as const satisfies Record<StudioGeometryKind, StudioCanvasGeometry>

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function getDefaultCanvasGeometry(
  kind: StudioGeometryKind
): StudioCanvasGeometry {
  return { ...STUDIO_CANVAS_GEOMETRY_DEFAULTS[kind] }
}

export function clampCanvasGeometry(
  geometry: StudioCanvasGeometry
): StudioCanvasGeometry {
  const widthPercent = clampValue(
    geometry.widthPercent,
    MIN_GEOMETRY_SIZE_PERCENT,
    100
  )
  const heightPercent = clampValue(
    geometry.heightPercent,
    MIN_GEOMETRY_SIZE_PERCENT,
    100
  )

  return {
    widthPercent,
    heightPercent,
    xPercent: clampValue(
      geometry.xPercent,
      widthPercent / 2,
      100 - widthPercent / 2
    ),
    yPercent: clampValue(
      geometry.yPercent,
      heightPercent / 2,
      100 - heightPercent / 2
    ),
  }
}

export function getLayerCanvasGeometry(
  layer: StudioCanvasLayer
): StudioCanvasGeometry {
  const defaults = getDefaultCanvasGeometry(
    layer.kind === "captions"
      ? "captions"
      : layer.kind === "media_overlay"
        ? "overlay"
        : "text"
  )

  return clampCanvasGeometry({
    xPercent: layer.xPercent ?? defaults.xPercent,
    yPercent: layer.yPercent ?? defaults.yPercent,
    widthPercent: layer.widthPercent ?? defaults.widthPercent,
    heightPercent: layer.heightPercent ?? defaults.heightPercent,
  })
}

export function getOverlaySegmentCanvasGeometry(
  segment: StudioTimelineSegment
): StudioCanvasGeometry {
  const defaults = getDefaultCanvasGeometry("overlay")

  return clampCanvasGeometry({
    xPercent: segment.xPercent ?? defaults.xPercent,
    yPercent: segment.yPercent ?? defaults.yPercent,
    widthPercent: segment.widthPercent ?? defaults.widthPercent,
    heightPercent: segment.heightPercent ?? defaults.heightPercent,
  })
}

export function moveCanvasGeometry(
  geometry: StudioCanvasGeometry,
  delta: {
    xPercent: number
    yPercent: number
  }
) {
  return clampCanvasGeometry({
    ...geometry,
    xPercent: geometry.xPercent + delta.xPercent,
    yPercent: geometry.yPercent + delta.yPercent,
  })
}

export function resizeCanvasGeometry(
  geometry: StudioCanvasGeometry,
  handle: "bottom-left" | "bottom-right" | "top-left" | "top-right",
  delta: {
    xPercent: number
    yPercent: number
  }
) {
  const left = geometry.xPercent - geometry.widthPercent / 2
  const right = geometry.xPercent + geometry.widthPercent / 2
  const top = geometry.yPercent - geometry.heightPercent / 2
  const bottom = geometry.yPercent + geometry.heightPercent / 2
  const nextLeft = handle.includes("left")
    ? clampValue(left + delta.xPercent, 0, right - MIN_GEOMETRY_SIZE_PERCENT)
    : left
  const nextRight = handle.includes("right")
    ? clampValue(right + delta.xPercent, left + MIN_GEOMETRY_SIZE_PERCENT, 100)
    : right
  const nextTop = handle.includes("top")
    ? clampValue(top + delta.yPercent, 0, bottom - MIN_GEOMETRY_SIZE_PERCENT)
    : top
  const nextBottom = handle.includes("bottom")
    ? clampValue(bottom + delta.yPercent, top + MIN_GEOMETRY_SIZE_PERCENT, 100)
    : bottom

  return clampCanvasGeometry({
    xPercent: (nextLeft + nextRight) / 2,
    yPercent: (nextTop + nextBottom) / 2,
    widthPercent: nextRight - nextLeft,
    heightPercent: nextBottom - nextTop,
  })
}
