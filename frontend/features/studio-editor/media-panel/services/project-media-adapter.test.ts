import { describe, expect, it } from "vitest"

import type { MediaLibraryItem } from "@/features/media-library/media-library.types"
import type { ProjectMedia } from "@/features/studio-hub/studio-projects.types"

import {
  assignStudioUploadPurposes,
  createProjectMediaFromResponse,
  getImportableMediaLibraryItems,
} from "./project-media-adapter"

const mediaId = "00000000-0000-4000-8000-000000000001"
const projectMediaId = "00000000-0000-4000-8000-000000000002"

const projectMedia: ProjectMedia = {
  id: projectMediaId,
  role: "OVERLAY",
  createdAt: "2026-06-21T00:00:00.000Z",
  media: {
    id: mediaId,
    type: "IMAGE",
    title: "Logo",
    originalFilename: "logo.png",
    duration: null,
    mimeType: "image/png",
    width: 800,
    height: 800,
    status: "UPLOADED",
  },
}

function createLibraryItem(id: string): MediaLibraryItem {
  return {
    id,
    title: "Media",
    originalFilename: "media.png",
    assetUrl: null,
    thumbnailUrl: null,
    duration: null,
    fileSizeBytes: 100,
    mimeType: "image/png",
    type: "IMAGE",
    libraryGroup: "ORIGINAL",
    status: "UPLOADED",
    width: 800,
    height: 800,
    createdAt: "2026-06-21T00:00:00.000Z",
    updatedAt: "2026-06-21T00:00:00.000Z",
    hasTranscript: false,
    hasChapters: false,
    hasClips: false,
    hasSubtitles: false,
    activeJobCount: 0,
  }
}

describe("project media adapter", () => {
  it("assigns the first uploaded video or audio as source for a blank project", () => {
    expect(
      assignStudioUploadPurposes(
        ["IMAGE", "VIDEO", "AUDIO", "VIDEO"],
        false
      )
    ).toEqual(["PROJECT_MEDIA", "SOURCE", "PROJECT_MEDIA", "PROJECT_MEDIA"])
    expect(
      assignStudioUploadPurposes(["VIDEO", "AUDIO"], true)
    ).toEqual(["PROJECT_MEDIA", "PROJECT_MEDIA"])
  })

  it("keeps media and project-media identifiers separate", () => {
    const result = createProjectMediaFromResponse(projectMedia)

    expect(result.id).toBe(mediaId)
    expect(result.projectMediaId).toBe(projectMediaId)
  })

  it("filters already attached media from the import list", () => {
    const attached = createProjectMediaFromResponse(projectMedia)
    const availableId = "00000000-0000-4000-8000-000000000003"

    expect(
      getImportableMediaLibraryItems(
        [attached],
        [createLibraryItem(mediaId), createLibraryItem(availableId)]
      ).map((item) => item.id)
    ).toEqual([availableId])
  })
})
