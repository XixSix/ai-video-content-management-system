import { z } from 'zod'

export const platformRouteSchema = z.enum(['YOUTUBE', 'FACEBOOK'])

export const platformParamsSchema = z.strictObject({
  platform: platformRouteSchema
})

export const workspacePlatformParamsSchema = z.strictObject({
  workspaceId: z.uuid(),
  platform: platformRouteSchema
})

export const platformOAuthCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
  error_description: z.string().min(1).optional()
})

export type PlatformParams = z.infer<typeof platformParamsSchema>
export type WorkspacePlatformParams = z.infer<typeof workspacePlatformParamsSchema>
export type PlatformOAuthCallbackQuery = z.infer<typeof platformOAuthCallbackQuerySchema>
export type PlatformRoute = z.infer<typeof platformRouteSchema>
