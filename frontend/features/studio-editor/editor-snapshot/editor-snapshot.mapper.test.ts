import { describe, expect, it } from "vitest"

import type { ProjectDetail } from "@/features/studio-hub/studio-projects.types"

import {
  createDefaultEditorDocument,
  createStudioProjectFromDetail,
  hydrateEditorDocument,
  serializeEditorDocument,
} from "./editor-snapshot.mapper"
import {
  editorDocumentSchema,
  type EditorDocument,
} from "./editor-snapshot.schema"

const projectId = "00000000-0000-4000-8000-000000000001"
const userId = "00000000-0000-4000-8000-000000000002"
const workspaceId = "00000000-0000-4000-8000-000000000003"
const sourceMediaId = "00000000-0000-4000-8000-000000000004"
const imageMediaId = "00000000-0000-4000-8000-000000000005"

const project: ProjectDetail = {
  id: projectId,
  userId,
  workspaceId,
  sourceMediaId,
  thumbnailMediaId: null,
  title: "Launch edit",
  slug: "launch-edit",
  status: "DRAFT",
  aspectRatio: "16:9",
  duration: 90,
  sourceMedia: {
    id: sourceMediaId,
    type: "VIDEO",
    title: "Launch video",
    originalFilename: "launch.mp4",
    duration: 90,
    mimeType: "video/mp4",
    width: 1920,
    height: 1080,
    status: "UPLOADED",
  },
  thumbnailMedia: null,
  projectMedia: [
    {
      id: "00000000-0000-4000-8000-000000000006",
      role: "SOURCE",
      createdAt: "2026-06-21T00:00:00.000Z",
      media: {
        id: sourceMediaId,
        type: "VIDEO",
        title: "Launch video",
        originalFilename: "launch.mp4",
        duration: 90,
        mimeType: "video/mp4",
        width: 1920,
        height: 1080,
        status: "UPLOADED",
      },
    },
    {
      id: "00000000-0000-4000-8000-000000000007",
      role: "OVERLAY",
      createdAt: "2026-06-21T00:00:00.000Z",
      media: {
        id: imageMediaId,
        type: "IMAGE",
        title: "Logo",
        originalFilename: "logo.png",
        duration: null,
        mimeType: "image/png",
        width: 800,
        height: 800,
        status: "UPLOADED",
      },
    },
  ],
  createdAt: "2026-06-21T00:00:00.000Z",
  updatedAt: "2026-06-21T00:00:00.000Z",
}

const document: EditorDocument = {
  schemaVersion: 1,
  settings: {
    aspectRatio: "9:16",
  },
  layers: [
    {
      id: "headline",
      kind: "text",
      content: "Ship the story",
      visible: true,
      xPercent: 50,
      yPercent: 20,
      style: {
        fontFamily: "anton",
        fontSize: 24,
        textColor: "#ffffff",
      },
    },
    {
      id: "logo",
      kind: "image",
      mediaId: imageMediaId,
      visible: false,
      style: {},
    },
  ],
  timelineTracks: [
    {
      id: "TEXT",
      segments: [
        {
          id: "headline-segment",
          layerId: "headline",
          startTime: 2,
          durationSeconds: 5,
        },
      ],
    },
    {
      id: "OVERLAY_MEDIA",
      segments: [
        {
          id: "logo-segment",
          layerId: "logo",
          startTime: 4,
          durationSeconds: 8,
        },
      ],
    },
    {
      id: "SOURCE",
      segments: [
        {
          id: "source-segment",
          mediaId: sourceMediaId,
          startTime: 0,
          durationSeconds: 90,
        },
      ],
    },
    {
      id: "AUDIO",
      segments: [],
    },
  ],
}

describe("editor snapshot mapper", () => {
  it("creates a clean project-derived document for the first snapshot", () => {
    const result = createDefaultEditorDocument(project)

    expect(result.settings.aspectRatio).toBe("16:9")
    expect(result.layers).toEqual([])
    expect(result.timelineTracks.map((track) => track.id)).toEqual([
      "TEXT",
      "OVERLAY_MEDIA",
      "SOURCE",
      "AUDIO",
    ])
    expect(result.timelineTracks[2].segments).toEqual([
      {
        id: `source-${sourceMediaId}`,
        mediaId: sourceMediaId,
        startTime: 0,
        durationSeconds: 90,
      },
    ])
  })

  it("does not invent a source segment for a blank project", () => {
    const blankProject = {
      ...project,
      sourceMediaId: null,
      sourceMedia: null,
      duration: null,
      projectMedia: [],
    }
    const result = createDefaultEditorDocument(blankProject)
    const editorProject = createStudioProjectFromDetail(blankProject)

    expect(result.timelineTracks[2].segments).toEqual([])
    expect(editorProject.media.durationSeconds).toBe(0)
    expect(editorProject.media.durationLabel).toBe("0:00")
    expect(editorProject.sourceMedia.durationLabel).toBe("0:00")
  })

  it("hydrates and serializes only the persisted composition contract", () => {
    const editorProject = hydrateEditorDocument(
      createStudioProjectFromDetail(project),
      document
    )
    const result = serializeEditorDocument(editorProject)

    expect(editorProject.projectMedia[0].projectMediaId).toBe(
      "00000000-0000-4000-8000-000000000006"
    )
    expect(editorProject.projectMedia[0].id).toBe(sourceMediaId)
    expect(result).toEqual(document)
    expect(result.layers[0].style).not.toHaveProperty("className")
    expect(result.layers[0]).not.toHaveProperty("label")
    expect(result).not.toHaveProperty("currentTime")
    expect(result).not.toHaveProperty("transcript")
    expect(result.timelineTracks[0].segments[0]).toHaveProperty(
      "layerId",
      "headline"
    )
    expect(result.timelineTracks[2].segments[0]).toHaveProperty(
      "mediaId",
      sourceMediaId
    )
  })
})

describe("editor snapshot schema", () => {
  it("fails closed for unsupported versions and UI-only fields", () => {
    expect(
      editorDocumentSchema.safeParse({
        ...document,
        schemaVersion: 2,
      }).success
    ).toBe(false)
    expect(
      editorDocumentSchema.safeParse({
        ...document,
        currentTime: 12,
      }).success
    ).toBe(false)
  })
})
