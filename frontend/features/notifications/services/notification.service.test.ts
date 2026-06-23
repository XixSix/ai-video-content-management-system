import MockAdapter from "axios-mock-adapter"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"

import { notificationService } from "./notification.service"

const apiMock = new MockAdapter(authenticatedApiClient)
const notificationId = "123e4567-e89b-12d3-a456-426614174000"
const invitationId = "123e4567-e89b-12d3-a456-426614174001"

describe("notification service", () => {
  beforeEach(() => apiMock.reset())
  afterAll(() => apiMock.restore())

  it("uses the existing notifications endpoints and payload contracts", async () => {
    apiMock.onGet("/notifications", {
      params: { page: 1, limit: 10, unreadOnly: false },
    }).reply(200, {
      success: true,
      data: {
        items: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      },
    })
    apiMock.onGet("/notifications/unread-count").reply(200, {
      success: true,
      data: { count: 2 },
    })
    apiMock.onPatch(`/notifications/${notificationId}/read`).reply(200, {
      success: true,
      data: {
        notification: {
          id: notificationId,
          readAt: "2026-06-23T00:00:00.000Z",
        },
      },
    })
    apiMock.onPatch("/notifications/read-all").reply(200, {
      success: true,
      data: { count: 2 },
    })
    apiMock
      .onPost(`/workspace-invitations/${invitationId}/accept`)
      .reply(200, {
        success: true,
        data: {
          invitation: {
            id: invitationId,
            status: "ACCEPTED",
          },
        },
      })
    apiMock
      .onPost(`/workspace-invitations/${invitationId}/decline`)
      .reply(200, {
        success: true,
        data: {
          invitation: {
            id: invitationId,
            status: "DECLINED",
          },
        },
      })

    await expect(
      notificationService.list({ page: 1, limit: 10, unreadOnly: false })
    ).resolves.toHaveProperty("meta.limit", 10)
    await expect(notificationService.getUnreadCount()).resolves.toEqual({
      count: 2,
    })
    await expect(notificationService.markRead(notificationId)).resolves.toHaveProperty(
      "notification.id",
      notificationId
    )
    await expect(notificationService.markAllRead()).resolves.toEqual({
      count: 2,
    })
    await expect(
      notificationService.acceptInvitation(invitationId)
    ).resolves.toHaveProperty("invitation.status", "ACCEPTED")
    await expect(
      notificationService.declineInvitation(invitationId)
    ).resolves.toHaveProperty("invitation.status", "DECLINED")
  })
})
