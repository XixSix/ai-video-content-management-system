import { describe, expect, it } from "vitest"

import {
  decodeUint8WaveformPeaks,
  resampleWaveformPeaks,
} from "./waveform-peaks"

describe("waveform peak adapters", () => {
  it("normalizes uint8 peaks to zero through one", () => {
    expect(
      decodeUint8WaveformPeaks({
        version: 1,
        encoding: "uint8",
        scale: 255,
        durationSeconds: 1,
        sampleRate: 8000,
        channels: 1,
        requestedBinsPerSecond: 20,
        actualBinsPerSecond: 3,
        binCount: 3,
        peaks: [0, 128, 255],
      })
    ).toEqual([0, 128 / 255, 1])
  })

  it("rejects malformed waveform payloads", () => {
    expect(() =>
      decodeUint8WaveformPeaks({
        version: 1,
        encoding: "uint8",
        scale: 255,
        durationSeconds: 1,
        sampleRate: 8000,
        channels: 1,
        requestedBinsPerSecond: 20,
        actualBinsPerSecond: 1,
        binCount: 1,
        peaks: [256],
      })
    ).toThrow("unsigned 8-bit")
  })

  it("downsamples by preserving the maximum peak in each range", () => {
    expect(resampleWaveformPeaks([0.1, 0.8, 0.2, 0.6], 2)).toEqual([
      0.8,
      0.6,
    ])
  })
})
