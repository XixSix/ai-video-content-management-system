import { z } from 'zod'

export const renderExportParamsSchema = z.strictObject({
  workspaceId: z.uuid(),
  projectId: z.uuid()
})

export type RenderExportParams = z.infer<typeof renderExportParamsSchema>
