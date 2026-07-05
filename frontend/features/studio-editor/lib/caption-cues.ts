import type {
  StudioCaptionCue,
  StudioCaptionWordGroup,
  StudioTranscript,
  StudioTranscriptSegment,
  StudioTranscriptWord,
} from "../studio.types"

const MAX_CUE_DURATION_SECONDS = 16
const MAX_CUE_WORD_GROUPS = 26
const MAX_CUE_TEXT_LENGTH = 150
const MAX_SEGMENT_GAP_SECONDS = 0.9

function getVisibleText(text: string) {
  return text.trim().replace(/\s+([.,!?;:])/g, "$1")
}

function createWordGroup(word: StudioTranscriptWord): StudioCaptionWordGroup {
  const visibleText = getVisibleText(word.text)

  return {
    id: `group-${word.id}`,
    sourceWordId: word.id,
    sourceSegmentId: word.segmentId,
    startTime: word.startTime,
    endTime: word.endTime,
    sourceText: word.sourceText,
    text: visibleText,
    confidence: word.confidence,
    isEdited: visibleText !== word.sourceText,
    isOmitted: visibleText.length === 0,
  }
}

function createSegmentFallbackWordGroup(
  segment: StudioTranscriptSegment
): StudioCaptionWordGroup {
  const visibleText = getVisibleText(segment.text)

  return {
    id: `group-fallback-${segment.id}`,
    sourceWordId: `fallback-${segment.id}`,
    sourceSegmentId: segment.id,
    startTime: segment.startTime,
    endTime: segment.endTime,
    sourceText: segment.text,
    text: visibleText,
    confidence: segment.confidence,
    isEdited: false,
    isOmitted: visibleText.length === 0,
    isSynthetic: true,
  }
}

export function formatCaptionTimestamp(timeSeconds: number) {
  const totalHundredths = Math.max(0, Math.round(timeSeconds * 100))
  const hours = Math.floor(totalHundredths / 360000)
  const minutes = Math.floor((totalHundredths % 360000) / 6000)
  const seconds = Math.floor((totalHundredths % 6000) / 100)
  const hundredths = totalHundredths % 100

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`
  }

  if (minutes > 0) {
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`
  }

  return `${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`
}

export function countTranscriptWords(words: StudioTranscriptWord[]) {
  return words.reduce((count, word) => {
    const visibleText = getVisibleText(word.text)

    if (!visibleText) {
      return count
    }

    return count + visibleText.split(/\s+/).length
  }, 0)
}

export function rebuildTranscriptSegmentsFromWords(
  segments: StudioTranscriptSegment[],
  words: StudioTranscriptWord[]
) {
  const wordsBySegmentId = new Map<string, StudioTranscriptWord[]>()

  for (const word of words) {
    const existing = wordsBySegmentId.get(word.segmentId)

    if (existing) {
      existing.push(word)
      continue
    }

    wordsBySegmentId.set(word.segmentId, [word])
  }

  return segments.map((segment) => {
    const segmentWords = wordsBySegmentId.get(segment.id) ?? []
    const text = segmentWords
      .map((word) => getVisibleText(word.text))
      .filter(Boolean)
      .join(" ")
      .replace(/\s+([.,!?;:])/g, "$1")

    return {
      ...segment,
      text,
    }
  })
}

export function rebuildTranscriptMeta(
  transcript: StudioTranscript,
  segments: StudioTranscriptSegment[],
  words: StudioTranscriptWord[]
) {
  const fullText = segments
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+([.,!?;:])/g, "$1")

  return {
    ...transcript,
    fullText,
    isEdited: true,
    wordCount: countTranscriptWords(words),
  }
}

export function buildCaptionCues(
  segments: StudioTranscriptSegment[],
  words: StudioTranscriptWord[]
) {
  const wordsBySegmentId = new Map<string, StudioTranscriptWord[]>()

  for (const word of words) {
    const existing = wordsBySegmentId.get(word.segmentId)

    if (existing) {
      existing.push(word)
      continue
    }

    wordsBySegmentId.set(word.segmentId, [word])
  }

  const cues: StudioCaptionCue[] = []
  let currentCue: StudioCaptionCue | null = null

  for (const segment of segments) {
    const segmentWords = wordsBySegmentId.get(segment.id) ?? []
    const nextGroups = (segmentWords.length > 0 ? segmentWords : [])
      .sort((left, right) => left.wordIndex - right.wordIndex)
      .map(createWordGroup)
    const cueWordGroups =
      nextGroups.length > 0 ? nextGroups : [createSegmentFallbackWordGroup(segment)]

    if (cueWordGroups.every((group) => group.isOmitted)) {
      continue
    }

    const visibleTextLength = cueWordGroups.reduce((count, group) => count + group.text.length, 0)

    if (!currentCue) {
      currentCue = {
        id: `cue-${segment.id}`,
        startTime: segment.startTime,
        endTime: segment.endTime,
        speakerLabel: segment.speakerLabel,
        sourceSegmentIds: [segment.id],
        wordGroups: cueWordGroups,
      }

      continue
    }

    const cueTextLength = currentCue.wordGroups.reduce((count, group) => count + group.text.length, 0)
    const gapSeconds = segment.startTime - currentCue.endTime
    const canAppend =
      currentCue.speakerLabel === segment.speakerLabel &&
      gapSeconds <= MAX_SEGMENT_GAP_SECONDS &&
      segment.endTime - currentCue.startTime <= MAX_CUE_DURATION_SECONDS &&
      currentCue.wordGroups.length + cueWordGroups.length <= MAX_CUE_WORD_GROUPS &&
      cueTextLength + visibleTextLength <= MAX_CUE_TEXT_LENGTH

    if (!canAppend) {
      cues.push(currentCue)
      currentCue = {
        id: `cue-${segment.id}`,
        startTime: segment.startTime,
        endTime: segment.endTime,
        speakerLabel: segment.speakerLabel,
        sourceSegmentIds: [segment.id],
        wordGroups: cueWordGroups,
      }
      continue
    }

    currentCue = {
      ...currentCue,
      endTime: segment.endTime,
      sourceSegmentIds: [...currentCue.sourceSegmentIds, segment.id],
      wordGroups: [...currentCue.wordGroups, ...cueWordGroups],
    }
  }

  if (currentCue) {
    cues.push(currentCue)
  }

  return cues
}
