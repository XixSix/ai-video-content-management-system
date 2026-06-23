import { describe, expect, it } from "vitest"

import {
  countUnreadNotifications,
  applyInvitationActionToList,
  markAllNotificationsReadInList,
  markNotificationReadInList,
  mergeNotificationIntoList,
} from "./notification-cache"
import {
  canRespondToNotificationInvitation,
  getNotificationBadgeLabel,
  getNotificationInvitationStatusLabel,
} from "./notification.utils"
import { notificationQueryKeys } from "./hooks/notification-query-keys"
import type { NotificationItem, NotificationListResponse } from "./notification.types"

const baseNotification: NotificationItem = {
  id: "notification-1",
  type: "WORKSPACE_INVITATION",
  title: "Workspace invitation",
  message: "Owner invited you",
  data: null,
  readAt: null,
  createdAt: "2026-06-23T00:00:00.000Z",
  actor: null,
  workspaceInvitation: {
    id: "invitation-1",
    status: "PENDING",
    expiresAt: "2026-06-30T00:00:00.000Z",
    workspace: {
      id: "workspace-1",
      name: "Creator Team",
      slug: "creator-team",
    },
  },
}

const baseList: NotificationListResponse = {
  items: [baseNotification],
  meta: {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
}

describe("notification frontend boundaries", () => {
  it("keeps notification caches isolated by list params", () => {
    expect(
      notificationQueryKeys.list({ page: 1, limit: 10, unreadOnly: false })
    ).not.toEqual(
      notificationQueryKeys.list({ page: 1, limit: 10, unreadOnly: true })
    )
  })

  it("prepends created notifications into the first page only", () => {
    const created = {
      ...baseNotification,
      id: "notification-2",
    }

    expect(
      mergeNotificationIntoList(baseList, created, {
        prependIfMissing: true,
      })
    ).toMatchObject({
      items: [created, baseNotification],
      meta: {
        total: 2,
      },
    })
  })

  it("updates read state without touching unrelated items", () => {
    const readAt = "2026-06-23T00:02:00.000Z"

    expect(markNotificationReadInList(baseList, baseNotification.id, readAt))
      .toMatchObject({
        items: [{ id: baseNotification.id, readAt }],
      })
    expect(markAllNotificationsReadInList(baseList, readAt)).toMatchObject({
      items: [{ id: baseNotification.id, readAt }],
    })
  })

  it("applies invitation action updates without touching other notifications", () => {
    const readAt = "2026-06-23T00:03:00.000Z"

    expect(
      applyInvitationActionToList(
        baseList,
        {
          id: "invitation-1",
          status: "ACCEPTED",
          expiresAt: "2026-06-30T00:00:00.000Z",
          respondedAt: readAt,
          createdAt: "2026-06-23T00:00:00.000Z",
          updatedAt: readAt,
          workspace: baseNotification.workspaceInvitation!.workspace,
          inviter: {
            id: "owner-1",
            email: "owner@example.com",
            fullName: "Owner",
          },
          invitee: {
            id: "member-1",
            email: "member@example.com",
            fullName: "Member",
          },
        },
        readAt
      )
    ).toMatchObject({
      items: [
        {
          workspaceInvitation: {
            status: "ACCEPTED",
          },
          readAt,
        },
      ],
    })
  })

  it("keeps invitation actions visible only for pending notifications", () => {
    expect(canRespondToNotificationInvitation(baseNotification)).toBe(true)
    expect(
      canRespondToNotificationInvitation({
        ...baseNotification,
        workspaceInvitation: {
          ...baseNotification.workspaceInvitation!,
          status: "DECLINED",
        },
      })
    ).toBe(false)
  })

  it("formats unread badge and invitation status labels", () => {
    expect(getNotificationBadgeLabel(105)).toBe("99+")
    expect(getNotificationInvitationStatusLabel(baseNotification.workspaceInvitation)).toBe(
      "Pending invitation"
    )
    expect(countUnreadNotifications(baseList.items)).toBe(1)
  })
})
