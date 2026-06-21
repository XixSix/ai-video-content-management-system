import type { ParamsRequestHandler, QueryRequestHandler } from '../../types/express'
import { sendSuccess } from '../../utils/response'
import { streamNotificationEvents } from './notifications.events'
import type { ListNotificationsQuery, NotificationParams } from './notifications.schema'
import * as notificationsService from './notifications.service'
import type { NotificationData, PaginatedNotifications } from './notifications.types'

export const list: QueryRequestHandler<ListNotificationsQuery> = async (req, res, next): Promise<void> => {
  try {
    const query = req.query as ListNotificationsQuery
    const result = await notificationsService.listNotifications(req.user!.id, query)

    sendSuccess<{ items: NotificationData[]; meta: Omit<PaginatedNotifications, 'items'> }>(res, {
      items: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    })
  } catch (error: unknown) {
    next(error)
  }
}

export const unreadCount: ParamsRequestHandler<Record<string, never>> = async (req, res, next): Promise<void> => {
  try {
    const count = await notificationsService.getUnreadCount(req.user!.id)
    sendSuccess<{ count: number }>(res, { count })
  } catch (error: unknown) {
    next(error)
  }
}

export const markRead: ParamsRequestHandler<NotificationParams> = async (req, res, next): Promise<void> => {
  try {
    const result = await notificationsService.markNotificationRead(req.user!.id, req.params.notificationId)
    sendSuccess<{ notification: NotificationData }>(res, { notification: result.notification })
  } catch (error: unknown) {
    next(error)
  }
}

export const markAllRead: ParamsRequestHandler<Record<string, never>> = async (req, res, next): Promise<void> => {
  try {
    const result = await notificationsService.markAllNotificationsRead(req.user!.id)
    sendSuccess<{ count: number }>(res, { count: result.count })
  } catch (error: unknown) {
    next(error)
  }
}

export const events: ParamsRequestHandler<Record<string, never>> = async (req, res, next): Promise<void> => {
  await streamNotificationEvents({
    onError: next,
    res,
    userId: req.user!.id
  })
}
