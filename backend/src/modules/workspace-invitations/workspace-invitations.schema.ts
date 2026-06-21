import { z } from 'zod'

const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Invalid email address'))

export const workspaceInvitationCreateParamsSchema = z.strictObject({
  workspaceId: z.uuid()
})

export const workspaceInvitationParamsSchema = z.strictObject({
  invitationId: z.uuid()
})

export const createWorkspaceInvitationSchema = z.strictObject({
  email: emailSchema
})

export type WorkspaceInvitationCreateParams = z.infer<typeof workspaceInvitationCreateParamsSchema>
export type WorkspaceInvitationParams = z.infer<typeof workspaceInvitationParamsSchema>
export type CreateWorkspaceInvitationBody = z.infer<typeof createWorkspaceInvitationSchema>
