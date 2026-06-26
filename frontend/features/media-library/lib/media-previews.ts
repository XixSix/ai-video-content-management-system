import type {
  MediaApiType,
  MediaDetailResponseData,
  MediaListItemResponseData,
} from "../types/media-library.types";

const MAX_PREVIEW_POLLING_MS = 30_000;

export type MediaPreviewSpriteSheet = {
  url: string;
  sheetIndex: number;
  sheetCount: number;
  frameCount: number;
  firstFrameIndex: number;
  startTime: number;
  endTime: number;
  effectiveIntervalSeconds: number;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
};

export type MediaWaveformPeaksPayload = {
  version: 1;
  encoding: "uint8";
  scale: number;
  durationSeconds: number;
  sampleRate: number;
  channels?: number;
  requestedBinsPerSecond: number;
  actualBinsPerSecond: number;
  binCount: number;
  peaks: number[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

export function getMediaListThumbnailUrl(media: MediaListItemResponseData) {
  return media.thumbnail?.url ?? null;
}

export function getMediaPreviewThumbnailUrl(media: MediaDetailResponseData) {
  return media.previews.thumbnail?.url ?? null;
}

export function getMediaWaveformAssetUrl(media: MediaDetailResponseData) {
  return media.previews.waveformPeaks?.url ?? null;
}

export function shouldPollMediaListPreviews(media: MediaListItemResponseData) {
  return (
    media.status === "UPLOADED" && media.type === "VIDEO" && !media.thumbnail
  );
}

function requiresGeneratedDetailPreviews(mediaType: MediaApiType) {
  return mediaType === "VIDEO" || mediaType === "AUDIO";
}

export function shouldPollMediaDetailPreviews(media: MediaDetailResponseData) {
  if (
    media.status !== "UPLOADED" ||
    !requiresGeneratedDetailPreviews(media.type)
  ) {
    return false;
  }

  if (media.type === "VIDEO") {
    return (
      !media.previews.thumbnail ||
      media.previews.thumbnailSprites.length < 1 ||
      !media.previews.waveformPeaks
    );
  }

  return !media.previews.waveformPeaks;
}

export function getPreviewPollingInterval(
  startedAt: number | null,
  now = Date.now(),
) {
  if (startedAt === null) {
    return 2_000;
  }

  return now - startedAt < MAX_PREVIEW_POLLING_MS ? 2_000 : false;
}

export function parseMediaPreviewSpriteSheets(
  media: MediaDetailResponseData,
): MediaPreviewSpriteSheet[] {
  return media.previews.thumbnailSprites.flatMap((asset) => {
    const metadata = asset.metadata;

    if (!isRecord(metadata)) {
      return [];
    }

    const sheetIndex = getInteger(metadata.sheetIndex);
    const sheetCount = getInteger(metadata.sheetCount);
    const frameCount = getInteger(metadata.frameCount);
    const firstFrameIndex = getInteger(metadata.firstFrameIndex);
    const startTime = getNumber(metadata.startTime);
    const endTime = getNumber(metadata.endTime);
    const effectiveIntervalSeconds = getNumber(
      metadata.effectiveIntervalSeconds,
    );
    const columns = getInteger(metadata.columns);
    const rows = getInteger(metadata.rows);
    const frameWidth = getInteger(metadata.frameWidth);
    const frameHeight = getInteger(metadata.frameHeight);

    if (
      sheetIndex === null ||
      sheetCount === null ||
      frameCount === null ||
      firstFrameIndex === null ||
      startTime === null ||
      endTime === null ||
      effectiveIntervalSeconds === null ||
      columns === null ||
      rows === null ||
      frameWidth === null ||
      frameHeight === null ||
      frameCount < 1 ||
      columns < 1 ||
      rows < 1 ||
      frameWidth < 1 ||
      frameHeight < 1
    ) {
      return [];
    }

    return [
      {
        url: asset.url,
        sheetIndex,
        sheetCount,
        frameCount,
        firstFrameIndex,
        startTime,
        endTime,
        effectiveIntervalSeconds,
        columns,
        rows,
        frameWidth,
        frameHeight,
      },
    ];
  });
}

export function parseWaveformPeaksPayload(
  payload: unknown,
): MediaWaveformPeaksPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const version = getInteger(payload.version);
  const encoding = payload.encoding;
  const scale = getNumber(payload.scale);
  const durationSeconds = getNumber(payload.durationSeconds);
  const sampleRate = getNumber(payload.sampleRate);
  const channels = getInteger(payload.channels);
  const requestedBinsPerSecond = getNumber(payload.requestedBinsPerSecond);
  const actualBinsPerSecond = getNumber(payload.actualBinsPerSecond);
  const binCount = getInteger(payload.binCount);
  const peaks = Array.isArray(payload.peaks)
    ? payload.peaks.filter(
        (peak): peak is number =>
          typeof peak === "number" && Number.isFinite(peak),
      )
    : null;

  if (
    version !== 1 ||
    encoding !== "uint8" ||
    scale === null ||
    scale <= 0 ||
    durationSeconds === null ||
    durationSeconds <= 0 ||
    sampleRate === null ||
    sampleRate <= 0 ||
    requestedBinsPerSecond === null ||
    requestedBinsPerSecond <= 0 ||
    actualBinsPerSecond === null ||
    actualBinsPerSecond <= 0 ||
    binCount === null ||
    binCount < 1 ||
    peaks === null ||
    peaks.length !== binCount
  ) {
    return null;
  }

  return {
    version,
    encoding,
    scale,
    durationSeconds,
    sampleRate,
    channels: channels ?? undefined,
    requestedBinsPerSecond,
    actualBinsPerSecond,
    binCount,
    peaks,
  };
}

export function normalizeWaveformPeaks(payload: MediaWaveformPeaksPayload) {
  return payload.peaks.map((peak) =>
    Math.max(0.08, Math.min(1, peak / payload.scale)),
  );
}

export function resampleWaveformPeaks(peaks: number[], barCount: number) {
  if (barCount < 1 || peaks.length < 1) {
    return [];
  }

  if (peaks.length === barCount) {
    return peaks;
  }

  const samplesPerBar = peaks.length / barCount;

  return Array.from({ length: barCount }, (_, barIndex) => {
    const startIndex = Math.floor(barIndex * samplesPerBar);
    const endIndex = Math.max(
      startIndex + 1,
      Math.floor((barIndex + 1) * samplesPerBar),
    );
    let peak = 0.08;

    for (
      let index = startIndex;
      index < endIndex && index < peaks.length;
      index += 1
    ) {
      peak = Math.max(peak, peaks[index] ?? 0);
    }

    return Math.min(1, peak);
  });
}
