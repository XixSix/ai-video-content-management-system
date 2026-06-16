import type {
  StudioCaptionCue,
  StudioCaptionWordGroup,
} from "../../studio.types"

export function isCueActive(cue: StudioCaptionCue, currentTime: number) {
  return currentTime >= cue.startTime && currentTime <= cue.endTime
}

export function getActiveCaptionCue(
  cues: StudioCaptionCue[],
  currentTime: number
) {
  return cues.find((cue) => isCueActive(cue, currentTime)) ?? null
}

export function isWordGroupActive(
  wordGroup: StudioCaptionWordGroup,
  currentTime: number
) {
  return currentTime >= wordGroup.startTime && currentTime <= wordGroup.endTime
}
