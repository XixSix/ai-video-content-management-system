import type {
  StudioCaptionCue,
  StudioCaptionWordGroup,
} from "../../studio.types"

export function isCueActive(cue: StudioCaptionCue, currentTime: number) {
  return currentTime >= cue.startTime && currentTime <= cue.endTime
}

export function isWordGroupActive(
  wordGroup: StudioCaptionWordGroup,
  currentTime: number
) {
  return currentTime >= wordGroup.startTime && currentTime <= wordGroup.endTime
}

export function filterCaptionCues(cues: StudioCaptionCue[], search: string) {
  const query = search.trim().toLowerCase()

  if (!query) {
    return cues
  }

  return cues.filter((cue) => {
    return (
      cue.speakerLabel.toLowerCase().includes(query) ||
      cue.wordGroups.some((group) => group.text.toLowerCase().includes(query))
    )
  })
}

export function getActiveCueId({
  cues,
  currentTime,
  filteredCues,
}: {
  cues: StudioCaptionCue[]
  currentTime: number
  filteredCues: StudioCaptionCue[]
}) {
  return (
    filteredCues.find((cue) => isCueActive(cue, currentTime))?.id ??
    cues.find((cue) => isCueActive(cue, currentTime))?.id
  )
}
