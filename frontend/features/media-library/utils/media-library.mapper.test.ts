import { describe, expect, it } from "vitest"

import {
  isEditorOutputAssetType,
  mapGeneratedAssetToLibraryItem,
  mapMediaResponseToLibraryItem,
} from "./media-library.mapper"

describe("media library mapper", () => {
  it("marks uploaded videos as long-to-short sources", () => {
    const item = mapMediaResponseToLibraryItem({
      id: "media-id",
      workspaceId: "workspace-id",
      type: "VIDEO",
      title: "Source video",
      description: null,
      originalFilename: "source.mp4",
      duration: 120,
      fileSizeBytes: "1024",
      mimeType: "video/mp4",
      width: 1920,
      height: 1080,
      metadata: null,
      status: "UPLOADED",
      createdAt: "2026-06-26T10:00:00.000Z",
      updatedAt: "2026-06-26T10:00:00.000Z",
      thumbnail: null,
    })

    expect(item.libraryGroup).toBe("ORIGINAL")
    expect(item.longToShortSourceId).toBe("media-id")
  })

  it("maps generated assets as editor outputs", () => {
    const item = mapGeneratedAssetToLibraryItem({
      id: "asset-id",
      mediaId: "media-id",
      projectId: "project-id",
      transcriptId: null,
      chapterId: null,
      shortClipId: null,
      assetType: "EXPORT_VIDEO",
      transcriptVersion: null,
      mimeType: "video/mp4",
      fileSizeBytes: "2048",
      metadata: null,
      createdAt: "2026-06-26T10:00:00.000Z",
    })

    expect(item.libraryGroup).toBe("EDITOR_OUTPUT")
    expect(item.generatedAssetId).toBe("asset-id")
    expect(item.status).toBe("UPLOADED")
    expect(item.type).toBe("VIDEO")
  })

  it("hides generated preview helper assets from editor outputs", () => {
    expect(isEditorOutputAssetType("THUMBNAIL")).toBe(false)
    expect(isEditorOutputAssetType("THUMBNAIL_SPRITE")).toBe(false)
    expect(isEditorOutputAssetType("WAVEFORM_PEAKS")).toBe(false)
    expect(isEditorOutputAssetType("EXPORT_VIDEO")).toBe(true)
    expect(isEditorOutputAssetType("SUBTITLE_VTT")).toBe(true)
  })
})
