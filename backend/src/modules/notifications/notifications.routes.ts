import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import * as notificationsController from './notifications.controller'
import { listNotificationsQuerySchema, notificationParamsSchema } from './notifications.schema'

const router = Router()

router.use(authenticate)

router.get('/', validateRequest({ query: listNotificationsQuerySchema }), notificationsController.list)
router.get('/unread-count', notificationsController.unreadCount)
router.get('/events', notificationsController.events)
router.patch('/read-all', notificationsController.markAllRead)
router.patch(
  '/:notificationId/read',
  validateRequest({ params: notificationParamsSchema }),
  notificationsController.markRead
)

export { router as notificationsRoutes }
