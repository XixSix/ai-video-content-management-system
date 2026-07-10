import type {
  StudioTranscriptSegment,
  StudioTranscriptWord,
} from "../studio.types"

function createTranscriptWords(segments: StudioTranscriptSegment[]) {
  let runningWordIndex = 0

  return segments.flatMap<StudioTranscriptWord>((segment) => {
    const tokens = segment.text.split(/\s+/)
    const wordDuration =
      (segment.endTime - segment.startTime) / Math.max(tokens.length, 1)

    return tokens.map((token, tokenIndex) => {
      const startTime = Number(
        (segment.startTime + tokenIndex * wordDuration).toFixed(2)
      )
      const endTime = Number(
        (tokenIndex === tokens.length - 1
          ? segment.endTime
          : segment.startTime + (tokenIndex + 1) * wordDuration
        ).toFixed(2)
      )

      const nextWord: StudioTranscriptWord = {
        id: `word_${String(runningWordIndex + 1).padStart(3, "0")}`,
        segmentId: segment.id,
        wordIndex: runningWordIndex,
        startTime,
        endTime,
        sourceText: token,
        text: token,
        confidence: segment.confidence,
      }

      runningWordIndex += 1

      return nextWord
    })
  })
}

export const transcriptSegments: StudioTranscriptSegment[] = [
  {
    id: "segment_001",
    segmentIndex: 0,
    startTime: 0,
    endTime: 8.2,
    text: "Today we are showing how teams can ship short-form content faster from one source recording.",
    speakerLabel: "Speaker 1",
    confidence: 0.98,
  },
  {
    id: "segment_002",
    segmentIndex: 1,
    startTime: 8.2,
    endTime: 15.6,
    text: "The workflow starts with a clean transcript before anything downstream becomes useful.",
    speakerLabel: "Speaker 1",
    confidence: 0.97,
  },
  {
    id: "segment_003",
    segmentIndex: 2,
    startTime: 15.6,
    endTime: 24.3,
    text: "Once the wording is right, chapter generation and clip selection stop drifting away from the actual message.",
    speakerLabel: "Speaker 1",
    confidence: 0.96,
  },
  {
    id: "segment_004",
    segmentIndex: 3,
    startTime: 24.3,
    endTime: 33.4,
    text: "That gives the team something they can review, publish, and reuse without re-uploading the source video.",
    speakerLabel: "Speaker 2",
    confidence: 0.95,
  },
]

export const transcriptWords = createTranscriptWords(transcriptSegments)
export const transcriptFullText = transcriptSegments
  .map((segment) => segment.text)
  .join(" ")
