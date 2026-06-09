import { z } from 'zod'
import { PublishStatus } from '../../infrastructure/db/generated/prisma/client'

export const publishTaskPlatformSchema = z.enum(['YOUTUBE', 'FACEBOOK', 'TIKTOK'])

export const publishTaskParamsSchema = z.strictObject({
  publishTaskId: z.uuid()
})

const hashtagsSchema = z.array(z.string().trim().min(1).max(100)).max(30)
const scheduledAtSchema = z.iso.datetime().transform((value) => new Date(value))

export const createPublishTaskSchema = z
  .strictObject({
    mediaId: z.uuid().optional(),
    shortClipId: z.uuid().optional(),
    platform: publishTaskPlatformSchema,
    platformAccountId: z.uuid(),
    title: z.string().trim().min(1).max(255).optional(),
    caption: z.string().trim().min(1).max(5000).optional(),
    description: z.string().trim().min(1).max(5000).optional(),
    hashtags: hashtagsSchema.optional().nullable(),
    scheduledAt: scheduledAtSchema.optional()
  })
  .refine((value) => Boolean(value.mediaId) !== Boolean(value.shortClipId), {
    message: 'Exactly one of mediaId or shortClipId is required',
    path: ['mediaId']
  })

export const listPublishTasksQuerySchema = z.strictObject({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  platform: publishTaskPlatformSchema.optional(),
  status: z.enum(PublishStatus).optional(),
  mediaId: z.uuid().optional(),
  shortClipId: z.uuid().optional(),
  platformAccountId: z.uuid().optional(),
  sortBy: z.enum(['createdAt', 'scheduledAt', 'publishedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const updatePublishTaskSchema = z
  .strictObject({
    platformAccountId: z.uuid().optional(),
    title: z.string().trim().min(1).max(255).nullable().optional(),
    caption: z.string().trim().min(1).max(5000).nullable().optional(),
    description: z.string().trim().min(1).max(5000).nullable().optional(),
    hashtags: hashtagsSchema.optional().nullable(),
    scheduledAt: scheduledAtSchema.nullable().optional()
  })
  .refine(
    (value) =>
      Object.hasOwn(value, 'platformAccountId') ||
      Object.hasOwn(value, 'title') ||
      Object.hasOwn(value, 'caption') ||
      Object.hasOwn(value, 'description') ||
      Object.hasOwn(value, 'hashtags') ||
      Object.hasOwn(value, 'scheduledAt'),
    {
      message: 'At least one field is required'
    }
  )

export type PublishTaskParams = z.infer<typeof publishTaskParamsSchema>
export type CreatePublishTaskBody = z.infer<typeof createPublishTaskSchema>
export type ListPublishTasksQuery = z.infer<typeof listPublishTasksQuerySchema>
export type UpdatePublishTaskBody = z.infer<typeof updatePublishTaskSchema>
