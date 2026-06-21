import { z } from 'zod'

export const workspaceParamsSchema = z.strictObject({
  workspaceId: z.uuid()
})

export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>
