import { describe, expect, it } from "vitest"

import { mapProjectToCard } from "./studio-projects.mapper"
import type { ProjectSummary } from "./studio-projects.types"

const baseProject: ProjectSummary = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  userId: "123e4567-e89b-12d3-a456-426614174002",
  workspaceId: "123e4567-e89b-12d3-a456-426614174003",
  sourceMediaId: null,
  thumbnailMediaId: null,
  title: "Blank project",
  slug: "blank-project-abcd",
  status: "DRAFT",
  aspectRatio: "9:16",
  duration: null,
  sourceMedia: null,
  thumbnailMedia: null,
  createdAt: "2026-06-20T10:00:00.000Z",
  updatedAt: "2026-06-20T10:00:00.000Z",
}

describe("mapProjectToCard", () => {
  it("maps a blank project to an explicit no-source state", () => {
    expect(mapProjectToCard(baseProject)).toMatchObject({
      sourceLabel: "No source media",
      sourceType: null,
    })
  })

  it("prefers the source title and preserves its supported type", () => {
    expect(
      mapProjectToCard({
        ...baseProject,
        sourceMedia: {
          id: "123e4567-e89b-12d3-a456-426614174004",
          type: "VIDEO",
          title: "Launch film",
          originalFilename: "launch.mp4",
          duration: 120,
          mimeType: "video/mp4",
          width: 1920,
          height: 1080,
          status: "UPLOADED",
        },
      })
    ).toMatchObject({
      sourceLabel: "Launch film",
      sourceType: "VIDEO",
    })
  })
})
