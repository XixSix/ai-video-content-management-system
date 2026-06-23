export type Uint8WaveformPayload = {
  version: 1
  encoding: "uint8"
  scale: number
  durationSeconds: number
  sampleRate: number
  channels: 1
  requestedBinsPerSecond: number
  actualBinsPerSecond: number
  binCount: number
  peaks: number[]
}

export function decodeUint8WaveformPeaks(
  payload: Uint8WaveformPayload
): number[] {
  if (
    payload.encoding !== "uint8" ||
    payload.scale !== 255 ||
    payload.binCount !== payload.peaks.length
  ) {
    throw new Error("Invalid uint8 waveform payload")
  }

  return payload.peaks.map((peak) => {
    if (!Number.isInteger(peak) || peak < 0 || peak > payload.scale) {
      throw new Error("Waveform peak must be an unsigned 8-bit integer")
    }

    return peak / payload.scale
  })
}

export function resampleWaveformPeaks(
  peaks: number[],
  targetCount: number
): number[] {
  if (targetCount <= 0 || peaks.length === 0) {
    return []
  }

  if (peaks.length === targetCount) {
    return peaks
  }

  return Array.from({ length: targetCount }, (_, targetIndex) => {
    const start = Math.floor((targetIndex * peaks.length) / targetCount)
    const end = Math.max(
      start + 1,
      Math.floor(((targetIndex + 1) * peaks.length) / targetCount)
    )

    return Math.max(...peaks.slice(start, Math.min(end, peaks.length)))
  })
}
