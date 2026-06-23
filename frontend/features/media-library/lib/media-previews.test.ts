import { describe, expect, it } from "vitest"

import type {
  MediaDetailResponseData,
  MediaListItemResponseData,
} from "../media-library.types"
import {
  getMediaListThumbnailUrl,
  normalizeWaveformPeaks,
  parseMediaPreviewSpriteSheets,
  parseWaveformPeaksPayload,
  resampleWaveformPeaks,
  shouldPollMediaDetailPreviews,
  shouldPollMediaListPreviews,
} from "./media-previews"

const now = "2026-06-23T10:00:00.000Z"

function createListItem(
  overrides: Partial<MediaListItemResponseData> = {}
): MediaListItemResponseData {
  return {
    id: "media-1",
    workspaceId: "workspace-1",
    type: "VIDEO",
    title: "Upload",
    description: null,
    originalFilename: "upload.mp4",
    duration: 120,
    fileSizeBytes: "1024",
    mimeType: "video/mp4",
    width: 1920,
    height: 1080,
    metadata: null,
    status: "UPLOADED",
    createdAt: now,
    updatedAt: now,
    thumbnail: null,
    ...overrides,
  }
}

function createDetail(
  overrides: Partial<MediaDetailResponseData> = {}
): MediaDetailResponseData {
  return {
    id: "media-1",
    workspaceId: "workspace-1",
    type: "VIDEO",
    title: "Upload",
    description: null,
    originalFilename: "upload.mp4",
    duration: 120,
    fileSizeBytes: "1024",
    mimeType: "video/mp4",
    width: 1920,
    height: 1080,
    metadata: null,
    status: "UPLOADED",
    createdAt: now,
    updatedAt: now,
    previews: {
      thumbnail: null,
      thumbnailSprites: [],
      waveformPeaks: null,
    },
    ...overrides,
  }
}

describe("media preview helpers", () => {
  it("maps generated list thumbnails and keeps polling videos that are still missing them", () => {
    expect(getMediaListThumbnailUrl(createListItem())).toBeNull()
    expect(shouldPollMediaListPreviews(createListItem())).toBe(true)
    expect(
      shouldPollMediaListPreviews(
        createListItem({
          thumbnail: {
            id: "asset-1",
            url: "https://storage.example.com/thumb.jpg",
            assetType: "THUMBNAIL",
            mimeType: "image/jpeg",
            fileSizeBytes: "2048",
            metadata: null,
            expiresInSeconds: 900,
          },
        })
      )
    ).toBe(false)
  })

  it("polls media detail until video previews are complete", () => {
    expect(shouldPollMediaDetailPreviews(createDetail())).toBe(true)
    expect(
      shouldPollMediaDetailPreviews(
        createDetail({
          previews: {
            thumbnail: {
              id: "thumb-1",
              url: "https://storage.example.com/thumb.jpg",
              assetType: "THUMBNAIL",
              mimeType: "image/jpeg",
              fileSizeBytes: "2048",
              metadata: null,
              expiresInSeconds: 900,
            },
            thumbnailSprites: [
              {
                id: "sprite-1",
                url: "https://storage.example.com/sprite.jpg",
                assetType: "THUMBNAIL_SPRITE",
                mimeType: "image/jpeg",
                fileSizeBytes: "4096",
                metadata: {
                  sheetIndex: 0,
                  sheetCount: 1,
                  frameCount: 12,
                  firstFrameIndex: 0,
                  startTime: 0,
                  endTime: 120,
                  effectiveIntervalSeconds: 10,
                  columns: 4,
                  rows: 3,
                  frameWidth: 160,
                  frameHeight: 90,
                },
                expiresInSeconds: 900,
              },
            ],
            waveformPeaks: {
              id: "waveform-1",
              url: "https://storage.example.com/waveform.json",
              assetType: "WAVEFORM_PEAKS",
              mimeType: "application/json",
              fileSizeBytes: "1024",
              metadata: null,
              expiresInSeconds: 900,
            },
          },
        })
      )
    ).toBe(false)
  })

  it("parses sprite metadata and rejects malformed sheets", () => {
    const sprites = parseMediaPreviewSpriteSheets(
      createDetail({
        previews: {
          thumbnail: null,
          thumbnailSprites: [
            {
              id: "sprite-1",
              url: "https://storage.example.com/sprite.jpg",
              assetType: "THUMBNAIL_SPRITE",
              mimeType: "image/jpeg",
              fileSizeBytes: "4096",
              metadata: {
                sheetIndex: 0,
                sheetCount: 1,
                frameCount: 12,
                firstFrameIndex: 0,
                startTime: 0,
                endTime: 120,
                effectiveIntervalSeconds: 10,
                columns: 4,
                rows: 3,
                frameWidth: 160,
                frameHeight: 90,
              },
              expiresInSeconds: 900,
            },
            {
              id: "sprite-2",
              url: "https://storage.example.com/bad-sprite.jpg",
              assetType: "THUMBNAIL_SPRITE",
              mimeType: "image/jpeg",
              fileSizeBytes: "4096",
              metadata: { sheetIndex: 1 },
              expiresInSeconds: 900,
            },
          ],
          waveformPeaks: null,
        },
      })
    )

    expect(sprites).toHaveLength(1)
    expect(sprites[0]?.columns).toBe(4)
  })

  it("normalizes and resamples server waveform peaks", () => {
    const payload = parseWaveformPeaksPayload({
      version: 1,
      encoding: "uint8",
      scale: 255,
      durationSeconds: 12,
      sampleRate: 8000,
      requestedBinsPerSecond: 20,
      actualBinsPerSecond: 20,
      binCount: 4,
      peaks: [0, 64, 128, 255],
    })

    expect(payload).not.toBeNull()

    const normalized = normalizeWaveformPeaks(payload!)
    const resampled = resampleWaveformPeaks(normalized, 2)

    expect(normalized[0]).toBe(0.08)
    expect(normalized[3]).toBe(1)
    expect(resampled).toEqual([normalized[1], normalized[3]])
  })
})
