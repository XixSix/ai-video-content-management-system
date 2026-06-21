import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const invitationCreateMock = jest.fn()
const invitationFindUniqueOrThrowMock = jest.fn()
const invitationUpdateManyMock = jest.fn()
const notificationCreateMock = jest.fn()
const notificationUpdateManyMock = jest.fn()
const workspaceMemberCreateMock = jest.fn()
const transactionMock = jest.fn(async (callback: (transaction: unknown) => unknown) =>
  callback({
    workspaceInvitation: {
      create: invitationCreateMock,
      findUniqueOrThrow: invitationFindUniqueOrThrowMock,
      updateMany: invitationUpdateManyMock
    },
    notification: {
      create: notificationCreateMock,
      updateMany: notificationUpdateManyMock
    },
    workspaceMember: {
      create: workspaceMemberCreateMock
    }
  })
)

jest.unstable_mockModule('../../infrastructure/db/prisma', () => ({
  prisma: {
    $transaction: transactionMock
  }
}))

const invitationsRepository = await import('./workspace-invitations.repository')

const workspaceId = '00000000-0000-4000-8000-000000000001'
const inviterId = '00000000-0000-4000-8000-000000000002'
const inviteeId = '00000000-0000-4000-8000-000000000003'
const invitationId = '00000000-0000-4000-8000-000000000004'
const notificationId = '00000000-0000-4000-8000-000000000005'
const now = new Date('2026-06-21T10:00:00.000Z')
const expiresAt = new Date('2026-06-28T10:00:00.000Z')

const notification = {
  id: notificationId,
  recipientId: inviteeId
}

const invitation = {
  id: invitationId,
  workspaceId,
  inviterId,
  inviteeId,
  notification
}

beforeEach(() => {
  jest.clearAllMocks()
  invitationCreateMock.mockResolvedValue({ id: invitationId })
  notificationCreateMock.mockResolvedValue(notification)
  invitationFindUniqueOrThrowMock.mockResolvedValue(invitation)
  invitationUpdateManyMock.mockResolvedValue({ count: 1 })
  notificationUpdateManyMock.mockResolvedValue({ count: 1 })
  workspaceMemberCreateMock.mockResolvedValue({ id: '00000000-0000-4000-8000-000000000006' })
})

describe('workspace invitations repository transactions', () => {
  it('creates the invitation and notification atomically', async () => {
    await invitationsRepository.createInvitationWithNotification({
      workspaceId,
      inviterId,
      inviteeId,
      workspaceName: 'Creator Workspace',
      inviterName: 'Owner',
      expiresAt
    })

    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(invitationCreateMock).toHaveBeenCalledWith({
      data: {
        workspaceId,
        inviterId,
        inviteeId,
        expiresAt
      }
    })
    expect(notificationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientId: inviteeId,
          actorId: inviterId,
          workspaceInvitationId: invitationId,
          type: 'WORKSPACE_INVITATION'
        })
      })
    )
  })

  it('claims a pending invitation, creates membership, and marks its notification read atomically', async () => {
    invitationFindUniqueOrThrowMock.mockResolvedValueOnce({ workspaceId }).mockResolvedValueOnce(invitation)

    await invitationsRepository.acceptInvitation(invitationId, inviteeId, now)

    expect(invitationUpdateManyMock).toHaveBeenCalledWith({
      where: {
        id: invitationId,
        inviteeId,
        status: 'PENDING',
        expiresAt: { gt: now }
      },
      data: {
        status: 'ACCEPTED',
        respondedAt: now
      }
    })
    expect(workspaceMemberCreateMock).toHaveBeenCalledWith({
      data: {
        workspaceId,
        userId: inviteeId,
        role: 'MEMBER'
      }
    })
    expect(notificationUpdateManyMock).toHaveBeenCalledWith({
      where: {
        workspaceInvitationId: invitationId,
        recipientId: inviteeId,
        readAt: null
      },
      data: { readAt: now }
    })
  })

  it('does not create membership when another request already claimed the invitation', async () => {
    invitationUpdateManyMock.mockResolvedValue({ count: 0 })

    await expect(invitationsRepository.acceptInvitation(invitationId, inviteeId, now)).resolves.toBeNull()
    expect(workspaceMemberCreateMock).not.toHaveBeenCalled()
    expect(notificationUpdateManyMock).not.toHaveBeenCalled()
  })
})
