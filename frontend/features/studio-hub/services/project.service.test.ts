import MockAdapter from "axios-mock-adapter"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { projectService } from "./project.service"

const apiMock = new MockAdapter(authenticatedApiClient)
const workspaceId = "123e4567-e89b-12d3-a456-426614174000"
const projectId = "123e4567-e89b-12d3-a456-426614174001"
const mediaId = "123e4567-e89b-12d3-a456-426614174002"
const projectMediaId = "123e4567-e89b-12d3-a456-426614174003"
const project = { id: projectId, title: "Campaign" }

describe("project service", () => {
  beforeEach(() => apiMock.reset())
  afterAll(() => apiMock.restore())

  it("passes server-side list filters, sort, and pagination", async () => {
    apiMock.onGet(`/workspaces/${workspaceId}/projects`).reply((config) => {
      expect(config.params).toEqual({
        page: 2,
        limit: 9,
        search: "launch",
        status: "ACTIVE",
        sortBy: "title",
        sortOrder: "asc",
      })

      return [
        200,
        {
          success: true,
          data: {
            items: [project],
            meta: { total: 1, page: 2, limit: 9, totalPages: 1 },
          },
        },
      ]
    })

    await expect(
      projectService.list(workspaceId, {
        page: 2,
        limit: 9,
        search: "launch",
        status: "ACTIVE",
        sortBy: "title",
        sortOrder: "asc",
      })
    ).resolves.toMatchObject({ items: [project] })
  })

  it("uses the detail and split creation endpoints", async () => {
    apiMock.onGet(`/workspaces/${workspaceId}/projects/${projectId}`).reply(200, {
      success: true,
      data: { project },
    })
    apiMock.onPost(`/workspaces/${workspaceId}/projects/blank`, { title: "Blank" }).reply(201, {
      success: true,
      data: { project },
    })
    apiMock
      .onPost(`/workspaces/${workspaceId}/projects/from-media`, { mediaId, title: "From media" })
      .reply(201, {
        success: true,
        data: { project },
      })

    await expect(projectService.get(workspaceId, projectId)).resolves.toEqual({ project })
    await expect(
      projectService.createBlank(workspaceId, { title: "Blank" })
    ).resolves.toEqual({ project })
    await expect(
      projectService.createFromMedia(workspaceId, { mediaId, title: "From media" })
    ).resolves.toEqual({ project })
  })

  it("uses patch for rename and delete for soft deletion", async () => {
    apiMock
      .onPatch(`/workspaces/${workspaceId}/projects/${projectId}`, { title: "Renamed" })
      .reply(200, { success: true, data: { project } })
    apiMock.onDelete(`/workspaces/${workspaceId}/projects/${projectId}`).reply(200, {
      success: true,
      data: { message: "Project deleted successfully" },
    })

    await expect(
      projectService.update(workspaceId, projectId, { title: "Renamed" })
    ).resolves.toEqual({ project })
    await expect(projectService.remove(workspaceId, projectId)).resolves.toEqual({
      message: "Project deleted successfully",
    })
  })

  it("attaches and detaches project media with separate IDs", async () => {
    const projectMedia = {
      id: projectMediaId,
      role: "OVERLAY",
      media: { id: mediaId },
    }

    apiMock
      .onPost(`/workspaces/${workspaceId}/projects/${projectId}/media`, { mediaId })
      .reply(201, {
        success: true,
        data: { projectMedia },
      })
    apiMock
      .onDelete(`/workspaces/${workspaceId}/projects/${projectId}/media/${projectMediaId}`)
      .reply(200, {
        success: true,
        data: { message: "Project media removed successfully" },
      })

    await expect(projectService.addMedia(workspaceId, projectId, mediaId)).resolves.toEqual({
      projectMedia,
    })
    await expect(
      projectService.removeMedia(workspaceId, projectId, projectMediaId)
    ).resolves.toEqual({
      message: "Project media removed successfully",
    })
  })

  it("sets project source media through the dedicated endpoint", async () => {
    apiMock
      .onPut(`/workspaces/${workspaceId}/projects/${projectId}/source-media`, { mediaId })
      .reply(200, {
        success: true,
        data: { project },
      })

    await expect(
      projectService.setSourceMedia(workspaceId, projectId, mediaId)
    ).resolves.toEqual({ project })
  })
})
