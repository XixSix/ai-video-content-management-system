import { describe, expect, it } from "vitest"

import { mapMediaResponseToLibraryItem } from "./media-library.mapper"

describe("mapMediaResponseToLibraryItem", () => {
  it("maps API strings and subtitle types into the current library model", () => {
    const item = mapMediaResponseToLibraryItem({
      id: "123e4567-e89b-12d3-a456-426614174001",
      workspaceId: "123e4567-e89b-12d3-a456-426614174000",
      type: "SUBTITLE",
      title: null,
      description: null,
      originalFilename: "captions.vtt",
      duration: null,
      fileSizeBytes: "2048",
      mimeType: "text/vtt",
      width: null,
      height: null,
      metadata: null,
      status: "UPLOADING",
      createdAt: "2026-06-19T10:00:00.000Z",
      updatedAt: "2026-06-19T10:00:00.000Z",
      thumbnail: null,
    })

    expect(item).toMatchObject({
      title: "captions.vtt",
      type: "TRANSCRIPT",
      fileSizeBytes: 2048,
      hasSubtitles: true,
      uploadInterrupted: true,
    })
  })

  it("maps generated thumbnail URLs into library cards", () => {
    const item = mapMediaResponseToLibraryItem({
      id: "123e4567-e89b-12d3-a456-426614174001",
      workspaceId: "123e4567-e89b-12d3-a456-426614174000",
      type: "VIDEO",
      title: "Launch",
      description: null,
      originalFilename: "launch.mp4",
      duration: 120,
      fileSizeBytes: "2048",
      mimeType: "video/mp4",
      width: 1920,
      height: 1080,
      metadata: null,
      status: "UPLOADED",
      createdAt: "2026-06-19T10:00:00.000Z",
      updatedAt: "2026-06-19T10:00:00.000Z",
      thumbnail: {
        id: "123e4567-e89b-12d3-a456-426614174002",
        url: "https://storage.example.com/thumbnail.jpg",
        assetType: "THUMBNAIL",
        mimeType: "image/jpeg",
        fileSizeBytes: "1024",
        metadata: null,
        expiresInSeconds: 900,
      },
    })

    expect(item.thumbnailUrl).toBe(
      "https://storage.example.com/thumbnail.jpg"
    )
  })
})
