import MockAdapter from "axios-mock-adapter"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { projectService } from "./project.service"

const apiMock = new MockAdapter(authenticatedApiClient)
const projectId = "123e4567-e89b-12d3-a456-426614174001"
const mediaId = "123e4567-e89b-12d3-a456-426614174002"
const project = { id: projectId, title: "Campaign" }

describe("project service", () => {
  beforeEach(() => apiMock.reset())
  afterAll(() => apiMock.restore())

  it("passes server-side list filters, sort, and pagination", async () => {
    apiMock.onGet("/projects").reply((config) => {
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
      projectService.list({
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
    apiMock.onGet(`/projects/${projectId}`).reply(200, {
      success: true,
      data: { project },
    })
    apiMock.onPost("/projects/blank", { title: "Blank" }).reply(201, {
      success: true,
      data: { project },
    })
    apiMock
      .onPost("/projects/from-media", { mediaId, title: "From media" })
      .reply(201, {
        success: true,
        data: { project },
      })

    await expect(projectService.get(projectId)).resolves.toEqual({ project })
    await expect(
      projectService.createBlank({ title: "Blank" })
    ).resolves.toEqual({ project })
    await expect(
      projectService.createFromMedia({ mediaId, title: "From media" })
    ).resolves.toEqual({ project })
  })

  it("uses patch for rename and delete for soft deletion", async () => {
    apiMock
      .onPatch(`/projects/${projectId}`, { title: "Renamed" })
      .reply(200, { success: true, data: { project } })
    apiMock.onDelete(`/projects/${projectId}`).reply(200, {
      success: true,
      data: { message: "Project deleted successfully" },
    })

    await expect(
      projectService.update(projectId, { title: "Renamed" })
    ).resolves.toEqual({ project })
    await expect(projectService.remove(projectId)).resolves.toEqual({
      message: "Project deleted successfully",
    })
  })
})
