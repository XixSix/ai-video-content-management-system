import { describe, expect, it } from "vitest"

import { getNextCompositionTime } from "./use-composition-playback"

describe("composition playback clock", () => {
  it("advances from the current timeline position", () => {
    expect(
      getNextCompositionTime({
        currentTime: 4,
        elapsedSeconds: 0.25,
        timelineDurationSeconds: 10,
      })
    ).toBe(4.25)
  })

  it("clamps playback at the timeline end", () => {
    expect(
      getNextCompositionTime({
        currentTime: 9.9,
        elapsedSeconds: 0.25,
        timelineDurationSeconds: 10,
      })
    ).toBe(10)
  })
})
