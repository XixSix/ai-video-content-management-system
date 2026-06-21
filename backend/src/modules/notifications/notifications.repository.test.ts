import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const notificationFindManyMock = jest.fn()
const notificationCountMock = jest.fn()
const notificationUpdateManyMock = jest.fn()
const transactionMock = jest.fn(async (callback: (transaction: unknown) => unknown) =>
  callback({
    notification: {
      findMany: notificationFindManyMock,
      updateMany: notificationUpdateManyMock
    }
  })
)

jest.unstable_mockModule('../../infrastructure/db/prisma', () => ({
  prisma: {
    $transaction: transactionMock,
    notification: {
      findMany: notificationFindManyMock,
      count: notificationCountMock,
      updateMany: notificationUpdateManyMock
    }
  }
}))

const notificationsRepository = await import('./notifications.repository')

const userId = '00000000-0000-4000-8000-000000000001'
const notificationId = '00000000-0000-4000-8000-000000000002'
const readAt = new Date('2026-06-21T10:00:00.000Z')

beforeEach(() => {
  jest.clearAllMocks()
  notificationFindManyMock.mockResolvedValue([])
  notificationCountMock.mockResolvedValue(0)
  notificationUpdateManyMock.mockResolvedValue({ count: 0 })
})

describe('notifications repository', () => {
  it('lists only recipient notifications newest first with unread filtering', async () => {
    await notificationsRepository.listNotifications(userId, true, 20, 10)

    expect(notificationFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          recipientId: userId,
          readAt: null
        },
        skip: 20,
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    )
    expect(notificationCountMock).toHaveBeenCalledWith({
      where: {
        recipientId: userId,
        readAt: null
      }
    })
  })

  it('marks all unread notifications and returns only the rows selected by the transaction', async () => {
    notificationFindManyMock
      .mockResolvedValueOnce([{ id: notificationId }])
      .mockResolvedValueOnce([{ id: notificationId, readAt }])

    const result = await notificationsRepository.markAllNotificationsRead(userId, readAt)

    expect(notificationUpdateManyMock).toHaveBeenCalledWith({
      where: {
        id: { in: [notificationId] },
        recipientId: userId,
        readAt: null
      },
      data: { readAt }
    })
    expect(result).toEqual([{ id: notificationId, readAt }])
  })
})
