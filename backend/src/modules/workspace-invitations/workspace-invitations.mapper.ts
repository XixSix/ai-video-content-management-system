import type { WorkspaceInvitationData, WorkspaceInvitationRecord } from './workspace-invitations.types'

export const toWorkspaceInvitationData = (invitation: WorkspaceInvitationRecord): WorkspaceInvitationData => ({
  id: invitation.id,
  status: invitation.status,
  expiresAt: invitation.expiresAt,
  respondedAt: invitation.respondedAt,
  createdAt: invitation.createdAt,
  updatedAt: invitation.updatedAt,
  workspace: invitation.workspace,
  inviter: invitation.inviter,
  invitee: invitation.invitee
})
