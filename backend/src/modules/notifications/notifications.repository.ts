import { prisma } from '../../infrastructure/db/prisma'
import { Prisma, WorkspaceInvitationStatus } from '../../infrastructure/db/generated/prisma/client'
import type { NotificationRecord } from './notifications.types'

const notificationInclude = {
  actor: {
    select: {
      id: true,
      email: true,
      fullName: true
    }
  },
  workspaceInvitation: {
    select: {
      id: true,
      status: true,
      expiresAt: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  }
} satisfies Prisma.NotificationInclude

const buildNotificationWhere = (recipientId: string, unreadOnly: boolean): Prisma.NotificationWhereInput => ({
  recipientId,
  ...(unreadOnly ? { readAt: null } : {})
})

export const expirePendingInvitationsForRecipient = async (recipientId: string, now: Date): Promise<number> => {
  const result = await prisma.workspaceInvitation.updateMany({
    where: {
      inviteeId: recipientId,
      status: WorkspaceInvitationStatus.PENDING,
      expiresAt: { lte: now }
    },
    data: {
      status: WorkspaceInvitationStatus.EXPIRED,
      respondedAt: now
    }
  })

  return result.count
}

export const listNotifications = async (
  recipientId: string,
  unreadOnly: boolean,
  skip: number,
  take: number
): Promise<[NotificationRecord[], number]> => {
  const where = buildNotificationWhere(recipientId, unreadOnly)

  return Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: notificationInclude
    }),
    prisma.notification.count({ where })
  ])
}

export const countUnreadNotifications = async (recipientId: string): Promise<number> =>
  prisma.notification.count({
    where: {
      recipientId,
      readAt: null
    }
  })

export const findNotificationForRecipient = async (
  notificationId: string,
  recipientId: string
): Promise<NotificationRecord | null> =>
  prisma.notification.findFirst({
    where: {
      id: notificationId,
      recipientId
    },
    include: notificationInclude
  })

export const markNotificationRead = async (
  notificationId: string,
  recipientId: string,
  readAt: Date
): Promise<NotificationRecord | null> => {
  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      recipientId,
      readAt: null
    },
    data: { readAt }
  })

  return findNotificationForRecipient(notificationId, recipientId)
}

export const markAllNotificationsRead = async (recipientId: string, readAt: Date): Promise<NotificationRecord[]> =>
  prisma.$transaction(async (transaction) => {
    const unreadNotifications = await transaction.notification.findMany({
      where: {
        recipientId,
        readAt: null
      },
      select: { id: true }
    })

    if (unreadNotifications.length === 0) {
      return []
    }

    const notificationIds = unreadNotifications.map(({ id }) => id)

    await transaction.notification.updateMany({
      where: {
        id: { in: notificationIds },
        recipientId,
        readAt: null
      },
      data: { readAt }
    })

    return transaction.notification.findMany({
      where: {
        id: { in: notificationIds },
        recipientId
      },
      orderBy: { createdAt: 'desc' },
      include: notificationInclude
    })
  })
