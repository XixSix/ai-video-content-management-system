import {
  TIMELINE_MAJOR_INTERVALS,
  TIMELINE_TARGET_TICK_WIDTH,
  TIMELINE_ZOOM_MAX,
  TIMELINE_ZOOM_MIN,
} from "../constants"

export function formatTimeLabel(totalSeconds: number) {
  const clampedSeconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(clampedSeconds / 3600)
  const minutes = Math.floor((clampedSeconds % 3600) / 60)
  const seconds = clampedSeconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function formatRulerTimeLabel(totalSeconds: number) {
  const clampedSeconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(clampedSeconds / 3600)
  const minutes = Math.floor((clampedSeconds % 3600) / 60)
  const seconds = clampedSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function getTimelineMajorStep(
  durationSeconds: number,
  timelinePixelWidth: number
) {
  const targetTickCount = Math.max(
    2,
    Math.floor(timelinePixelWidth / TIMELINE_TARGET_TICK_WIDTH)
  )
  const rawStep = durationSeconds / targetTickCount

  return (
    TIMELINE_MAJOR_INTERVALS.find((interval) => interval >= rawStep) ??
    TIMELINE_MAJOR_INTERVALS.at(-1) ??
    300
  )
}

export function getTimelineMinorStep(majorStep: number) {
  if (majorStep >= 300) {
    return 60
  }

  if (majorStep >= 120) {
    return 30
  }

  if (majorStep >= 60) {
    return 15
  }

  if (majorStep >= 30) {
    return 5
  }

  return Math.max(1, majorStep / 5)
}

export function buildRulerTicks(durationSeconds: number, stepSeconds: number) {
  const ticks: number[] = []

  for (let time = 0; time < durationSeconds; time += stepSeconds) {
    ticks.push(Number(time.toFixed(2)))
  }

  const roundedDuration = Number(durationSeconds.toFixed(2))
  if (ticks.at(-1) !== roundedDuration) {
    ticks.push(roundedDuration)
  }

  return ticks
}

export function clampTimelineZoom(zoomLevel: number) {
  return Math.min(TIMELINE_ZOOM_MAX, Math.max(TIMELINE_ZOOM_MIN, zoomLevel))
}

export function getTimelineZoomSliderValue(zoomLevel: number) {
  const normalizedZoom = clampTimelineZoom(zoomLevel)

  return (
    (Math.log(normalizedZoom / TIMELINE_ZOOM_MIN) /
      Math.log(TIMELINE_ZOOM_MAX / TIMELINE_ZOOM_MIN)) *
    100
  )
}

export function getTimelineZoomFromSliderValue(sliderValue: number) {
  return clampTimelineZoom(
    TIMELINE_ZOOM_MIN *
      (TIMELINE_ZOOM_MAX / TIMELINE_ZOOM_MIN) ** (sliderValue / 100)
  )
}

export function getTimelineTimeFromClientX({
  clientX,
  surfaceElement,
  timelineDurationSeconds,
}: {
  clientX: number
  surfaceElement: HTMLElement | null
  timelineDurationSeconds: number
}) {
  if (!surfaceElement) {
    return null
  }

  const surfaceRect = surfaceElement.getBoundingClientRect()
  const seekRatio = Math.min(
    1,
    Math.max(0, (clientX - surfaceRect.left) / surfaceRect.width)
  )

  return seekRatio * timelineDurationSeconds
}
