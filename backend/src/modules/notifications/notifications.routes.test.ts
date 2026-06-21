import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from '../auth/auth.types'
import { NotificationsError } from './notifications.error'
import type { NotificationData } from './notifications.types'

const getAuthenticatedUserMock = jest.fn<(accessToken: string) => Promise<AuthenticatedUser>>()
const listNotificationsMock = jest.fn()
const getUnreadCountMock = jest.fn()
const markNotificationReadMock = jest.fn()
const markAllNotificationsReadMock = jest.fn()

jest.unstable_mockModule('../auth/auth.service', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock
}))

jest.unstable_mockModule('./notifications.service', () => ({
  listNotifications: listNotificationsMock,
  getUnreadCount: getUnreadCountMock,
  markNotificationRead: markNotificationReadMock,
  markAllNotificationsRead: markAllNotificationsReadMock
}))

const { app } = await import('../../app')

const userId = '00000000-0000-4000-8000-000000000001'
const notificationId = '00000000-0000-4000-8000-000000000002'
const createdAt = new Date('2026-06-21T10:00:00.000Z')

const user: AuthenticatedUser = {
  id: userId,
  email: 'user@example.com',
  role: 'USER',
  status: 'ACTIVE'
}

const notification: NotificationData = {
  id: notificationId,
  type: 'WORKSPACE_INVITATION',
  title: 'Workspace invitation',
  message: 'You were invited',
  data: null,
  readAt: null,
  createdAt,
  actor: null,
  workspaceInvitation: null
}

beforeEach(() => {
  jest.resetAllMocks()
  getAuthenticatedUserMock.mockResolvedValue(user)
  listNotificationsMock.mockResolvedValue({
    items: [notification],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1
  })
  getUnreadCountMock.mockResolvedValue(1)
  markNotificationReadMock.mockResolvedValue({
    notification: { ...notification, readAt: createdAt },
    changed: true
  })
  markAllNotificationsReadMock.mockResolvedValue({
    notifications: [{ ...notification, readAt: createdAt }],
    count: 1
  })
})

describe('notification routes', () => {
  it.each([
    ['get', '/api/v1/notifications'],
    ['get', '/api/v1/notifications/unread-count'],
    ['get', '/api/v1/notifications/events'],
    ['patch', '/api/v1/notifications/read-all'],
    ['patch', `/api/v1/notifications/${notificationId}/read`]
  ] as const)('%s %s requires an access token', async (method, path) => {
    const response = await request(app)[method](path)
    expect(response.status).toBe(401)
  })

  it('lists notifications with parsed pagination and unread filter', async () => {
    const response = await request(app)
      .get('/api/v1/notifications')
      .query({ page: 2, limit: 10, unreadOnly: 'true' })
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(listNotificationsMock).toHaveBeenCalledWith(userId, {
      page: 2,
      limit: 10,
      unreadOnly: true
    })
    expect(response.body.data.items[0].createdAt).toBe(createdAt.toISOString())
  })

  it('returns unread count and supports marking one or all notifications read', async () => {
    const countResponse = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', 'Bearer access-token')
    const readResponse = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', 'Bearer access-token')
    const readAllResponse = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', 'Bearer access-token')

    expect(countResponse.body.data).toEqual({ count: 1 })
    expect(readResponse.body.data.notification.readAt).toBe(createdAt.toISOString())
    expect(readAllResponse.body.data).toEqual({ count: 1 })
  })

  it('validates query booleans and notification IDs', async () => {
    const invalidQuery = await request(app)
      .get('/api/v1/notifications')
      .query({ unreadOnly: 'yes' })
      .set('Authorization', 'Bearer access-token')
    const invalidId = await request(app)
      .patch('/api/v1/notifications/not-a-uuid/read')
      .set('Authorization', 'Bearer access-token')

    expect(invalidQuery.status).toBe(400)
    expect(invalidId.status).toBe(400)
  })

  it('returns 404 for notifications outside the current inbox', async () => {
    markNotificationReadMock.mockRejectedValue(NotificationsError.notFound())

    const response = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOTIFICATION_NOT_FOUND')
  })
})
