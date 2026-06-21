import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { NotificationRecord } from './notifications.types'

const expirePendingInvitationsForRecipientMock = jest.fn()
const listNotificationsMock = jest.fn()
const countUnreadNotificationsMock = jest.fn()
const findNotificationForRecipientMock = jest.fn()
const markNotificationReadMock = jest.fn()
const markAllNotificationsReadMock = jest.fn()
const publishNotificationEventMock = jest.fn()

jest.unstable_mockModule('./notifications.repository', () => ({
  expirePendingInvitationsForRecipient: expirePendingInvitationsForRecipientMock,
  listNotifications: listNotificationsMock,
  countUnreadNotifications: countUnreadNotificationsMock,
  findNotificationForRecipient: findNotificationForRecipientMock,
  markNotificationRead: markNotificationReadMock,
  markAllNotificationsRead: markAllNotificationsReadMock
}))

jest.unstable_mockModule('./notifications.realtime', () => ({
  publishNotificationEvent: publishNotificationEventMock
}))

const notificationsService = await import('./notifications.service')

const userId = '00000000-0000-4000-8000-000000000001'
const notificationId = '00000000-0000-4000-8000-000000000002'
const createdAt = new Date('2026-06-21T10:00:00.000Z')

const notification = {
  id: notificationId,
  recipientId: userId,
  actorId: null,
  workspaceInvitationId: null,
  type: 'WORKSPACE_INVITATION',
  title: 'Workspace invitation',
  message: 'You were invited',
  data: null,
  readAt: null,
  createdAt,
  actor: null,
  workspaceInvitation: null
} satisfies NotificationRecord

beforeEach(() => {
  jest.resetAllMocks()
  expirePendingInvitationsForRecipientMock.mockResolvedValue(0)
  listNotificationsMock.mockResolvedValue([[notification], 1])
  countUnreadNotificationsMock.mockResolvedValue(1)
  findNotificationForRecipientMock.mockResolvedValue(notification)
  markNotificationReadMock.mockResolvedValue({ ...notification, readAt: createdAt })
  markAllNotificationsReadMock.mockResolvedValue([{ ...notification, readAt: createdAt }])
  publishNotificationEventMock.mockResolvedValue()
})

describe('notifications service', () => {
  it('expires stale invitations before returning a paginated inbox', async () => {
    const result = await notificationsService.listNotifications(userId, {
      page: 2,
      limit: 20,
      unreadOnly: true
    })

    expect(expirePendingInvitationsForRecipientMock).toHaveBeenCalledWith(userId, expect.any(Date))
    expect(listNotificationsMock).toHaveBeenCalledWith(userId, true, 20, 20)
    expect(result).toMatchObject({ total: 1, page: 2, limit: 20, totalPages: 1 })
  })

  it('marks one notification read idempotently', async () => {
    const changed = await notificationsService.markNotificationRead(userId, notificationId)
    expect(changed.changed).toBe(true)
    expect(publishNotificationEventMock).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ event: 'notification.updated' })
    )

    findNotificationForRecipientMock.mockResolvedValue({ ...notification, readAt: createdAt })
    const unchanged = await notificationsService.markNotificationRead(userId, notificationId)
    expect(unchanged.changed).toBe(false)
    expect(markNotificationReadMock).toHaveBeenCalledTimes(1)
  })

  it('rejects notifications outside the current user inbox', async () => {
    findNotificationForRecipientMock.mockResolvedValue(null)

    await expect(notificationsService.markNotificationRead(userId, notificationId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOTIFICATION_NOT_FOUND'
    })
  })

  it('keeps DB success when realtime publishing fails', async () => {
    publishNotificationEventMock.mockRejectedValue(new Error('redis unavailable'))

    await expect(notificationsService.publishCreatedNotification(notification)).resolves.toBeUndefined()
    await expect(notificationsService.markAllNotificationsRead(userId)).resolves.toMatchObject({ count: 1 })
  })
})
