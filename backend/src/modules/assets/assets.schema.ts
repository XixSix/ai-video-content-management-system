import { z } from 'zod'
import { AssetType } from '../../infrastructure/db/generated/prisma/client'

export const assetParamsSchema = z.strictObject({
  assetId: z.uuid()
})

export const listAssetsQuerySchema = z.strictObject({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  assetType: z.enum(AssetType).optional(),
  transcriptId: z.uuid().optional(),
  chapterId: z.uuid().optional(),
  sortBy: z.enum(['createdAt', 'assetType']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export type AssetParams = z.infer<typeof assetParamsSchema>
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>
