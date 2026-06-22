import { UserStatus, WorkspaceInvitationStatus } from '../../infrastructure/db/generated/prisma/client'
import * as notificationsService from '../notifications/notifications.service'
import type { CreateWorkspaceInvitationBody } from './workspace-invitations.schema'
import { WorkspaceInvitationsError } from './workspace-invitations.error'
import { toWorkspaceInvitationData } from './workspace-invitations.mapper'
import * as invitationsRepo from './workspace-invitations.repository'
import type { WorkspaceInvitationData, WorkspaceInvitationRecord } from './workspace-invitations.types'

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export const createWorkspaceInvitation = async (
  workspaceId: string,
  inviterId: string,
  input: CreateWorkspaceInvitationBody
): Promise<WorkspaceInvitationData> => {
  const invitationContext = await invitationsRepo.findWorkspaceInvitationContext(workspaceId, inviterId)

  if (!invitationContext) {
    throw WorkspaceInvitationsError.forbidden()
  }

  const invitee = await invitationsRepo.findUserByEmail(input.email)

  if (!invitee || invitee.status !== UserStatus.ACTIVE) {
    throw WorkspaceInvitationsError.inviteeNotAvailable()
  }

  if (invitee.id === inviterId) {
    throw WorkspaceInvitationsError.selfInvitation()
  }

  if (await invitationsRepo.findMembership(workspaceId, invitee.id)) {
    throw WorkspaceInvitationsError.alreadyMember()
  }

  const now = new Date()
  await invitationsRepo.expirePendingInvitation(workspaceId, invitee.id, now)

  if (await invitationsRepo.findPendingInvitation(workspaceId, invitee.id)) {
    throw WorkspaceInvitationsError.pendingExists()
  }

  try {
    const result = await invitationsRepo.createInvitationWithNotification({
      workspaceId,
      inviterId,
      inviteeId: invitee.id,
      workspaceName: invitationContext.workspace.name,
      inviterName: invitationContext.user.fullName ?? invitationContext.user.email,
      expiresAt: new Date(now.getTime() + INVITATION_TTL_MS)
    })

    await notificationsService.publishCreatedNotification(result.notification)

    return toWorkspaceInvitationData(result.invitation)
  } catch (error: unknown) {
    if (invitationsRepo.isUniqueConstraintError(error)) {
      throw WorkspaceInvitationsError.pendingExists()
    }

    throw error
  }
}

export const acceptWorkspaceInvitation = async (
  invitationId: string,
  inviteeId: string
): Promise<WorkspaceInvitationData> => respondToInvitation(invitationId, inviteeId, 'accept')

export const declineWorkspaceInvitation = async (
  invitationId: string,
  inviteeId: string
): Promise<WorkspaceInvitationData> => respondToInvitation(invitationId, inviteeId, 'decline')

const respondToInvitation = async (
  invitationId: string,
  inviteeId: string,
  action: 'accept' | 'decline'
): Promise<WorkspaceInvitationData> => {
  const invitation = await invitationsRepo.findInvitationForInvitee(invitationId, inviteeId)

  if (!invitation) {
    throw WorkspaceInvitationsError.notFound()
  }

  if (invitation.status === WorkspaceInvitationStatus.EXPIRED) {
    throw WorkspaceInvitationsError.expired()
  }

  if (invitation.status !== WorkspaceInvitationStatus.PENDING) {
    throw WorkspaceInvitationsError.alreadyProcessed()
  }

  const now = new Date()

  if (invitation.expiresAt.getTime() <= now.getTime()) {
    const expired = await invitationsRepo.expireInvitationForInvitee(invitationId, inviteeId, now)
    await publishUpdatedNotification(expired?.notification ?? null)
    throw WorkspaceInvitationsError.expired()
  }

  try {
    const result =
      action === 'accept'
        ? await invitationsRepo.acceptInvitation(invitationId, inviteeId, now)
        : await invitationsRepo.declineInvitation(invitationId, inviteeId, now)

    if (!result) {
      return handleConcurrentResponse(invitationId, inviteeId, now)
    }

    await publishUpdatedNotification(result.notification)
    return toWorkspaceInvitationData(result.invitation)
  } catch (error: unknown) {
    if (invitationsRepo.isUniqueConstraintError(error)) {
      throw WorkspaceInvitationsError.alreadyMember()
    }

    throw error
  }
}

const handleConcurrentResponse = async (invitationId: string, inviteeId: string, now: Date): Promise<never> => {
  const current = await invitationsRepo.findInvitationForInvitee(invitationId, inviteeId)

  if (!current) {
    throw WorkspaceInvitationsError.notFound()
  }

  if (
    current.status === WorkspaceInvitationStatus.EXPIRED ||
    (current.status === WorkspaceInvitationStatus.PENDING && current.expiresAt.getTime() <= now.getTime())
  ) {
    throw WorkspaceInvitationsError.expired()
  }

  throw WorkspaceInvitationsError.alreadyProcessed()
}

const publishUpdatedNotification = async (notification: WorkspaceInvitationRecord['notification']): Promise<void> => {
  if (notification) {
    await notificationsService.publishUpdatedNotification(notification)
  }
}
