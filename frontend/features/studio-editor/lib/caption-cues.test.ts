import { describe, expect, it } from "vitest"

import type { StudioTranscriptSegment, StudioTranscriptWord } from "../studio.types"
import { buildCaptionCues } from "./caption-cues"

const segment = (
  overrides: Partial<StudioTranscriptSegment> = {}
): StudioTranscriptSegment => ({
  id: "segment-1",
  segmentIndex: 0,
  startTime: 0,
  endTime: 4,
  text: "Hello from segment text.",
  speakerLabel: "Speaker",
  confidence: 0.91,
  ...overrides,
})

const word = (overrides: Partial<StudioTranscriptWord> = {}): StudioTranscriptWord => ({
  id: "word-1",
  segmentId: "segment-1",
  wordIndex: 0,
  startTime: 0,
  endTime: 1,
  sourceText: "Hello",
  text: "Hello",
  confidence: 0.99,
  ...overrides,
})

describe("buildCaptionCues", () => {
  it("uses transcript words when word-level data is available", () => {
    const cues = buildCaptionCues([segment()], [word()])

    expect(cues).toHaveLength(1)
    expect(cues[0]?.wordGroups).toEqual([
      expect.objectContaining({
        sourceWordId: "word-1",
        text: "Hello",
      }),
    ])
    expect(cues[0]?.wordGroups[0]).not.toHaveProperty("isSynthetic")
  })

  it("falls back to segment text when transcript words are unavailable", () => {
    const cues = buildCaptionCues([segment()], [])

    expect(cues).toHaveLength(1)
    expect(cues[0]?.wordGroups).toEqual([
      expect.objectContaining({
        sourceWordId: "fallback-segment-1",
        text: "Hello from segment text.",
        isSynthetic: true,
      }),
    ])
  })
})
