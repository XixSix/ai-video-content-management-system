import type {
  StudioChapter,
  StudioTranscriptSegment,
} from "@/features/studio-editor/studio.types"

export function formatChapterTime(timeSeconds: number) {
  const totalSeconds = Math.max(0, Math.floor(timeSeconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function getChapterTimeParts(timeSeconds: number) {
  const totalSeconds = Math.max(0, Math.floor(timeSeconds))

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

export function formatChapterRange(chapter: StudioChapter) {
  return `${formatChapterTime(chapter.startTime)} - ${formatChapterTime(chapter.endTime)}`
}

export function getChapterDuration(chapter: StudioChapter) {
  return formatChapterTime(Math.max(0, chapter.endTime - chapter.startTime))
}

export function getChapterTranscriptPreview(
  chapter: StudioChapter,
  segments: StudioTranscriptSegment[]
) {
  return segments
    .filter((segment) => {
      return segment.startTime < chapter.endTime && segment.endTime > chapter.startTime
    })
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(" ")
}
