import MockAdapter from "axios-mock-adapter"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"

import { workspaceService } from "./workspace.service"

const apiMock = new MockAdapter(authenticatedApiClient)
const workspaceId = "123e4567-e89b-12d3-a456-426614174000"

describe("workspace service", () => {
  beforeEach(() => apiMock.reset())
  afterAll(() => apiMock.restore())

  it("uses the workspace list, detail, members, and preferred endpoints", async () => {
    const item = {
      id: workspaceId,
      name: "Creator team",
      slug: "creator-team",
      role: "OWNER",
      createdAt: "2026-06-23T00:00:00.000Z",
    }
    apiMock.onGet("/workspaces").reply(200, {
      success: true,
      data: { items: [item], preferredWorkspaceId: workspaceId },
    })
    apiMock.onGet(`/workspaces/${workspaceId}`).reply(200, {
      success: true,
      data: { workspace: item },
    })
    apiMock.onGet(`/workspaces/${workspaceId}/members`).reply(200, {
      success: true,
      data: { members: [] },
    })
    apiMock.onPut(`/workspaces/${workspaceId}/preferred`).reply(200, {
      success: true,
      data: { preferredWorkspaceId: workspaceId },
    })

    await expect(workspaceService.list()).resolves.toMatchObject({
      preferredWorkspaceId: workspaceId,
    })
    await expect(workspaceService.get(workspaceId)).resolves.toHaveProperty(
      "workspace.id",
      workspaceId
    )
    await expect(workspaceService.listMembers(workspaceId)).resolves.toEqual({
      members: [],
    })
    await expect(
      workspaceService.setPreferred(workspaceId)
    ).resolves.toEqual({ preferredWorkspaceId: workspaceId })
  })

  it("sends an invitation email to the nested workspace endpoint", async () => {
    apiMock
      .onPost(`/workspaces/${workspaceId}/invitations`, {
        email: "member@example.com",
      })
      .reply(201, {
        success: true,
        data: {
          invitation: {
            id: "invitation-id",
            invitee: { email: "member@example.com" },
          },
        },
      })

    await expect(
      workspaceService.invite(workspaceId, "member@example.com")
    ).resolves.toHaveProperty(
      "invitation.invitee.email",
      "member@example.com"
    )
  })
})
