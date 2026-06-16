import { MEDIA_SYNC_THRESHOLD_SECONDS } from "../constants"

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

export function syncMediaElementTime(
  mediaElement: HTMLMediaElement,
  timeSeconds: number,
  maxTimeSeconds?: number
) {
  const nextTime =
    typeof maxTimeSeconds === "number"
      ? Math.min(timeSeconds, maxTimeSeconds)
      : timeSeconds

  if (
    Math.abs(mediaElement.currentTime - nextTime) >
    MEDIA_SYNC_THRESHOLD_SECONDS
  ) {
    mediaElement.currentTime = nextTime
  }
}
