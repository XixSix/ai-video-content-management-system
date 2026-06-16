import type { StudioChapter } from "../../studio.types"

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

export function getChapterRangeLabel(chapter: StudioChapter) {
  return `${formatChapterTime(chapter.startTime)} - ${formatChapterTime(chapter.endTime)}`
}

export function getChapterDurationLabel(chapter: StudioChapter) {
  return formatChapterTime(Math.max(0, chapter.endTime - chapter.startTime))
}

export function getCurrentChapterId(
  chapters: StudioChapter[],
  currentTime: number
) {
  return chapters.find((chapter) => {
    return currentTime >= chapter.startTime && currentTime < chapter.endTime
  })?.id
}
