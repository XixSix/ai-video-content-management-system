import MockAdapter from "axios-mock-adapter"
import { describe, expect, it, afterEach } from "vitest"

import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { platformAccountsService } from "./platform-accounts.service"

const authenticatedMock = new MockAdapter(authenticatedApiClient)
const workspaceId = "123e4567-e89b-12d3-a456-426614174000"

describe("platformAccountsService", () => {
  afterEach(() => {
    authenticatedMock.reset()
  })

  it("lists platform accounts", async () => {
    const mockAccounts = [
      { id: "sa-1", workspaceId, platform: "YOUTUBE", status: "CONNECTED" },
    ]

    authenticatedMock.onGet(`/workspaces/${workspaceId}/platform-accounts`).reply(200, {
      success: true,
      data: { accounts: mockAccounts },
    })

    await expect(platformAccountsService.list(workspaceId)).resolves.toEqual({
      accounts: mockAccounts,
    })
  })

  it("connects a platform account", async () => {
    authenticatedMock
      .onPost(`/workspaces/${workspaceId}/platform-accounts/YOUTUBE/connect`)
      .reply(200, {
        success: true,
        data: { authUrl: "https://auth.example.com" },
      })

    await expect(
      platformAccountsService.connect(workspaceId, "YOUTUBE")
    ).resolves.toEqual({
      authUrl: "https://auth.example.com",
    })
  })

  it("disconnects a platform account", async () => {
    authenticatedMock
      .onDelete(`/workspaces/${workspaceId}/platform-accounts/YOUTUBE`)
      .reply(200, {
        success: true,
        data: { message: "Success" },
      })

    await expect(
      platformAccountsService.disconnect(workspaceId, "YOUTUBE")
    ).resolves.toEqual({
      message: "Success",
    })
  })
})
