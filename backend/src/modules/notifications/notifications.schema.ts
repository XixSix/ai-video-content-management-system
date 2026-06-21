import { z } from 'zod'

export const notificationParamsSchema = z.strictObject({
  notificationId: z.uuid()
})

export const listNotificationsQuerySchema = z.strictObject({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  unreadOnly: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .default(false)
})

export type NotificationParams = z.infer<typeof notificationParamsSchema>
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>
