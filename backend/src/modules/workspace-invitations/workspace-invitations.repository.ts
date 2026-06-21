import { prisma } from '../../infrastructure/db/prisma'
import {
  NotificationType,
  Prisma,
  type UserStatus,
  WorkspaceInvitationStatus,
  WorkspaceMemberRole
} from '../../infrastructure/db/generated/prisma/client'
import type { NotificationRecord } from '../notifications/notifications.types'
import type {
  CreateWorkspaceInvitationResult,
  InvitationUserData,
  RespondToInvitationResult,
  WorkspaceInvitationRecord,
  WorkspaceOwnerContext
} from './workspace-invitations.types'

const invitationInclude = {
  workspace: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  },
  inviter: {
    select: {
      id: true,
      email: true,
      fullName: true
    }
  },
  invitee: {
    select: {
      id: true,
      email: true,
      fullName: true
    }
  },
  notification: {
    include: {
      actor: {
        select: {
          id: true,
          email: true,
          fullName: true
        }
      },
      workspaceInvitation: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      }
    }
  }
} satisfies Prisma.WorkspaceInvitationInclude

const notificationInclude = {
  actor: {
    select: {
      id: true,
      email: true,
      fullName: true
    }
  },
  workspaceInvitation: {
    select: {
      id: true,
      status: true,
      expiresAt: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  }
} satisfies Prisma.NotificationInclude

export interface CreateInvitationInput {
  workspaceId: string
  inviterId: string
  inviteeId: string
  workspaceName: string
  inviterName: string
  expiresAt: Date
}

export const findWorkspaceOwnerContext = async (
  workspaceId: string,
  userId: string
): Promise<WorkspaceOwnerContext | null> =>
  prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
      role: WorkspaceMemberRole.OWNER
    },
    select: {
      id: true,
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      user: {
        select: {
          id: true,
          email: true,
          fullName: true
        }
      }
    }
  })

export const findUserByEmail = async (email: string): Promise<(InvitationUserData & { status: UserStatus }) | null> =>
  prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
      status: true
    }
  })

export const findMembership = async (workspaceId: string, userId: string): Promise<{ id: string } | null> =>
  prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId
      }
    },
    select: { id: true }
  })

export const expirePendingInvitation = async (workspaceId: string, inviteeId: string, now: Date): Promise<number> => {
  const result = await prisma.workspaceInvitation.updateMany({
    where: {
      workspaceId,
      inviteeId,
      status: WorkspaceInvitationStatus.PENDING,
      expiresAt: { lte: now }
    },
    data: {
      status: WorkspaceInvitationStatus.EXPIRED,
      respondedAt: now
    }
  })

  return result.count
}

export const findPendingInvitation = async (workspaceId: string, inviteeId: string): Promise<{ id: string } | null> =>
  prisma.workspaceInvitation.findFirst({
    where: {
      workspaceId,
      inviteeId,
      status: WorkspaceInvitationStatus.PENDING
    },
    select: { id: true }
  })

export const createInvitationWithNotification = async (
  input: CreateInvitationInput
): Promise<CreateWorkspaceInvitationResult> =>
  prisma.$transaction(async (transaction) => {
    const invitation = await transaction.workspaceInvitation.create({
      data: {
        workspaceId: input.workspaceId,
        inviterId: input.inviterId,
        inviteeId: input.inviteeId,
        expiresAt: input.expiresAt
      }
    })

    const notification = await transaction.notification.create({
      data: {
        recipientId: input.inviteeId,
        actorId: input.inviterId,
        workspaceInvitationId: invitation.id,
        type: NotificationType.WORKSPACE_INVITATION,
        title: 'Workspace invitation',
        message: `${input.inviterName} invited you to join ${input.workspaceName}`,
        data: {
          workspaceId: input.workspaceId,
          invitationId: invitation.id
        }
      },
      include: notificationInclude
    })

    const invitationWithRelations = await transaction.workspaceInvitation.findUniqueOrThrow({
      where: { id: invitation.id },
      include: invitationInclude
    })

    return {
      invitation: invitationWithRelations,
      notification
    }
  })

export const findInvitationForInvitee = async (
  invitationId: string,
  inviteeId: string
): Promise<WorkspaceInvitationRecord | null> =>
  prisma.workspaceInvitation.findFirst({
    where: {
      id: invitationId,
      inviteeId
    },
    include: invitationInclude
  })

export const expireInvitationForInvitee = async (
  invitationId: string,
  inviteeId: string,
  now: Date
): Promise<RespondToInvitationResult | null> =>
  prisma.$transaction(async (transaction) => {
    const result = await transaction.workspaceInvitation.updateMany({
      where: {
        id: invitationId,
        inviteeId,
        status: WorkspaceInvitationStatus.PENDING,
        expiresAt: { lte: now }
      },
      data: {
        status: WorkspaceInvitationStatus.EXPIRED,
        respondedAt: now
      }
    })

    if (result.count === 0) {
      return null
    }

    await transaction.notification.updateMany({
      where: {
        workspaceInvitationId: invitationId,
        recipientId: inviteeId,
        readAt: null
      },
      data: { readAt: now }
    })

    const invitation = await transaction.workspaceInvitation.findUniqueOrThrow({
      where: { id: invitationId },
      include: invitationInclude
    })

    return {
      invitation,
      notification: invitation.notification
    }
  })

export const acceptInvitation = async (
  invitationId: string,
  inviteeId: string,
  now: Date
): Promise<RespondToInvitationResult | null> =>
  prisma.$transaction(async (transaction) => {
    const claimed = await transaction.workspaceInvitation.updateMany({
      where: {
        id: invitationId,
        inviteeId,
        status: WorkspaceInvitationStatus.PENDING,
        expiresAt: { gt: now }
      },
      data: {
        status: WorkspaceInvitationStatus.ACCEPTED,
        respondedAt: now
      }
    })

    if (claimed.count === 0) {
      return null
    }

    const invitation = await transaction.workspaceInvitation.findUniqueOrThrow({
      where: { id: invitationId },
      select: { workspaceId: true }
    })

    await transaction.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId: inviteeId,
        role: WorkspaceMemberRole.MEMBER
      }
    })

    await transaction.notification.updateMany({
      where: {
        workspaceInvitationId: invitationId,
        recipientId: inviteeId,
        readAt: null
      },
      data: { readAt: now }
    })

    const invitationWithRelations = await transaction.workspaceInvitation.findUniqueOrThrow({
      where: { id: invitationId },
      include: invitationInclude
    })

    return {
      invitation: invitationWithRelations,
      notification: invitationWithRelations.notification
    }
  })

export const declineInvitation = async (
  invitationId: string,
  inviteeId: string,
  now: Date
): Promise<RespondToInvitationResult | null> =>
  prisma.$transaction(async (transaction) => {
    const declined = await transaction.workspaceInvitation.updateMany({
      where: {
        id: invitationId,
        inviteeId,
        status: WorkspaceInvitationStatus.PENDING,
        expiresAt: { gt: now }
      },
      data: {
        status: WorkspaceInvitationStatus.DECLINED,
        respondedAt: now
      }
    })

    if (declined.count === 0) {
      return null
    }

    await transaction.notification.updateMany({
      where: {
        workspaceInvitationId: invitationId,
        recipientId: inviteeId,
        readAt: null
      },
      data: { readAt: now }
    })

    const invitation = await transaction.workspaceInvitation.findUniqueOrThrow({
      where: { id: invitationId },
      include: invitationInclude
    })

    return {
      invitation,
      notification: invitation.notification
    }
  })

export const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'

export type { NotificationRecord }
