import MockAdapter from "axios-mock-adapter"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"

import { editorSnapshotService } from "./editor-snapshot.service"

const apiMock = new MockAdapter(authenticatedApiClient)
const workspaceId = "123e4567-e89b-12d3-a456-426614174000"
const projectId = "123e4567-e89b-12d3-a456-426614174001"

describe("editor snapshot service", () => {
  beforeEach(() => apiMock.reset())
  afterAll(() => apiMock.restore())

  it("loads snapshots from the workspace-scoped project deep link", async () => {
    apiMock
      .onGet(
        `/workspaces/${workspaceId}/projects/${projectId}/editor-snapshot`
      )
      .reply(200, {
        success: true,
        data: { editorSnapshot: null },
      })

    await expect(
      editorSnapshotService.get(workspaceId, projectId)
    ).resolves.toEqual({ editorSnapshot: null })
  })
})
