import type { WorkspaceInvitationStatus } from '../../infrastructure/db/generated/prisma/client'
import type { NotificationRecord } from '../notifications/notifications.types'

export interface InvitationUserData {
  id: string
  email: string
  fullName: string | null
}

export interface InvitationWorkspaceData {
  id: string
  name: string
  slug: string
}

export interface WorkspaceInvitationData {
  id: string
  status: WorkspaceInvitationStatus
  expiresAt: Date
  respondedAt: Date | null
  createdAt: Date
  updatedAt: Date
  workspace: InvitationWorkspaceData
  inviter: InvitationUserData
  invitee: InvitationUserData
}

export interface WorkspaceInvitationContext {
  id: string
  workspace: InvitationWorkspaceData
  user: InvitationUserData
}

export interface WorkspaceInvitationRecord extends WorkspaceInvitationData {
  workspaceId: string
  inviterId: string
  inviteeId: string
  notification: NotificationRecord | null
}

export interface CreateWorkspaceInvitationResult {
  invitation: WorkspaceInvitationRecord
  notification: NotificationRecord
}

export interface RespondToInvitationResult {
  invitation: WorkspaceInvitationRecord
  notification: NotificationRecord | null
}
