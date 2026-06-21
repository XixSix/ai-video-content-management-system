import { describe, expect, it } from "vitest"

import type { MediaLibraryItem } from "@/features/media-library/media-library.types"

import { getMediaImportMetadata } from "./media-display"

function createMediaItem(
  overrides: Partial<MediaLibraryItem>
): MediaLibraryItem {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Media",
    originalFilename: "media.mp4",
    assetUrl: null,
    thumbnailUrl: null,
    duration: 361.4,
    fileSizeBytes: 1024,
    mimeType: "video/mp4",
    type: "VIDEO",
    libraryGroup: "ORIGINAL",
    status: "UPLOADED",
    width: 1920,
    height: 1080,
    createdAt: "2026-06-21T00:00:00.000Z",
    updatedAt: "2026-06-21T00:00:00.000Z",
    hasTranscript: false,
    hasChapters: false,
    hasClips: false,
    hasSubtitles: false,
    activeJobCount: 0,
    ...overrides,
  }
}

describe("studio media display", () => {
  it("shows image resolution instead of a pending duration", () => {
    expect(
      getMediaImportMetadata(
        createMediaItem({
          duration: null,
          mimeType: "image/png",
          type: "IMAGE",
        })
      )
    ).toBe("image · 1920×1080")
  })

  it("shows duration for video and audio media", () => {
    expect(getMediaImportMetadata(createMediaItem({}))).toBe("video · 6:01")
    expect(
      getMediaImportMetadata(
        createMediaItem({
          duration: null,
          mimeType: "audio/mpeg",
          type: "AUDIO",
          width: null,
          height: null,
        })
      )
    ).toBe("audio · Pending")
  })
})
