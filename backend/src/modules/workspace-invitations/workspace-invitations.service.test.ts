import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { NotificationRecord } from '../notifications/notifications.types'
import type { WorkspaceInvitationContext, WorkspaceInvitationRecord } from './workspace-invitations.types'

const findWorkspaceInvitationContextMock = jest.fn()
const findUserByEmailMock = jest.fn()
const findMembershipMock = jest.fn()
const expirePendingInvitationMock = jest.fn()
const findPendingInvitationMock = jest.fn()
const createInvitationWithNotificationMock = jest.fn()
const findInvitationForInviteeMock = jest.fn()
const expireInvitationForInviteeMock = jest.fn()
const acceptInvitationMock = jest.fn()
const declineInvitationMock = jest.fn()
const isUniqueConstraintErrorMock = jest.fn()
const publishCreatedNotificationMock = jest.fn()
const publishUpdatedNotificationMock = jest.fn()

jest.unstable_mockModule('./workspace-invitations.repository', () => ({
  findWorkspaceInvitationContext: findWorkspaceInvitationContextMock,
  findUserByEmail: findUserByEmailMock,
  findMembership: findMembershipMock,
  expirePendingInvitation: expirePendingInvitationMock,
  findPendingInvitation: findPendingInvitationMock,
  createInvitationWithNotification: createInvitationWithNotificationMock,
  findInvitationForInvitee: findInvitationForInviteeMock,
  expireInvitationForInvitee: expireInvitationForInviteeMock,
  acceptInvitation: acceptInvitationMock,
  declineInvitation: declineInvitationMock,
  isUniqueConstraintError: isUniqueConstraintErrorMock
}))

jest.unstable_mockModule('../notifications/notifications.service', () => ({
  publishCreatedNotification: publishCreatedNotificationMock,
  publishUpdatedNotification: publishUpdatedNotificationMock
}))

const invitationsService = await import('./workspace-invitations.service')

const workspaceId = '00000000-0000-4000-8000-000000000001'
const ownerId = '00000000-0000-4000-8000-000000000002'
const inviteeId = '00000000-0000-4000-8000-000000000003'
const invitationId = '00000000-0000-4000-8000-000000000004'
const notificationId = '00000000-0000-4000-8000-000000000005'
const createdAt = new Date('2026-06-21T10:00:00.000Z')
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

const invitationContext: WorkspaceInvitationContext = {
  id: '00000000-0000-4000-8000-000000000006',
  workspace: {
    id: workspaceId,
    name: 'Creator Workspace',
    slug: 'creator-workspace'
  },
  user: {
    id: ownerId,
    email: 'owner@example.com',
    fullName: 'Owner'
  }
}

const notification = {
  id: notificationId,
  recipientId: inviteeId,
  actorId: ownerId,
  workspaceInvitationId: invitationId,
  type: 'WORKSPACE_INVITATION',
  title: 'Workspace invitation',
  message: 'Owner invited you',
  data: null,
  readAt: null,
  createdAt,
  actor: invitationContext.user,
  workspaceInvitation: {
    id: invitationId,
    status: 'PENDING',
    expiresAt,
    workspace: invitationContext.workspace
  }
} satisfies NotificationRecord

const invitation = {
  id: invitationId,
  workspaceId,
  inviterId: ownerId,
  inviteeId,
  status: 'PENDING',
  expiresAt,
  respondedAt: null,
  createdAt,
  updatedAt: createdAt,
  workspace: invitationContext.workspace,
  inviter: invitationContext.user,
  invitee: {
    id: inviteeId,
    email: 'invitee@example.com',
    fullName: null
  },
  notification
} satisfies WorkspaceInvitationRecord

beforeEach(() => {
  jest.resetAllMocks()
  findWorkspaceInvitationContextMock.mockResolvedValue(invitationContext)
  findUserByEmailMock.mockResolvedValue({
    id: inviteeId,
    email: 'invitee@example.com',
    fullName: null,
    status: 'ACTIVE'
  })
  findMembershipMock.mockResolvedValue(null)
  expirePendingInvitationMock.mockResolvedValue(0)
  findPendingInvitationMock.mockResolvedValue(null)
  createInvitationWithNotificationMock.mockResolvedValue({ invitation, notification })
  findInvitationForInviteeMock.mockResolvedValue(invitation)
  acceptInvitationMock.mockResolvedValue({
    invitation: { ...invitation, status: 'ACCEPTED', respondedAt: createdAt },
    notification: { ...notification, readAt: createdAt }
  })
  declineInvitationMock.mockResolvedValue({
    invitation: { ...invitation, status: 'DECLINED', respondedAt: createdAt },
    notification: { ...notification, readAt: createdAt }
  })
  isUniqueConstraintErrorMock.mockReturnValue(false)
  publishCreatedNotificationMock.mockResolvedValue()
  publishUpdatedNotificationMock.mockResolvedValue()
})

describe('workspace invitations service', () => {
  it('creates a pending invitation for an active registered user and publishes after persistence', async () => {
    const result = await invitationsService.createWorkspaceInvitation(workspaceId, ownerId, {
      email: 'invitee@example.com'
    })

    expect(createInvitationWithNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId,
        inviterId: ownerId,
        inviteeId,
        workspaceName: 'Creator Workspace',
        inviterName: 'Owner'
      })
    )
    expect(publishCreatedNotificationMock).toHaveBeenCalledWith(notification)
    expect(result.status).toBe('PENDING')
  })

  it('rejects when invitation context disappears before resolving the invitee', async () => {
    findWorkspaceInvitationContextMock.mockResolvedValue(null)

    await expect(
      invitationsService.createWorkspaceInvitation(workspaceId, ownerId, {
        email: 'invitee@example.com'
      })
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' })
    expect(findUserByEmailMock).not.toHaveBeenCalled()
  })

  it.each([null, { id: inviteeId, status: 'DISABLED' }])(
    'uses one unavailable error for unknown or disabled invitees',
    async (invitee) => {
      findUserByEmailMock.mockResolvedValue(invitee)

      await expect(
        invitationsService.createWorkspaceInvitation(workspaceId, ownerId, {
          email: 'invitee@example.com'
        })
      ).rejects.toMatchObject({ statusCode: 404, code: 'INVITEE_NOT_AVAILABLE' })
    }
  )

  it('rejects self invitations, existing members, and duplicate pending invitations', async () => {
    findUserByEmailMock.mockResolvedValueOnce({ id: ownerId, status: 'ACTIVE' })
    await expect(
      invitationsService.createWorkspaceInvitation(workspaceId, ownerId, { email: 'owner@example.com' })
    ).rejects.toMatchObject({ code: 'SELF_INVITATION_NOT_ALLOWED' })

    findMembershipMock.mockResolvedValueOnce({ id: 'membership-id' })
    await expect(
      invitationsService.createWorkspaceInvitation(workspaceId, ownerId, { email: 'invitee@example.com' })
    ).rejects.toMatchObject({ code: 'ALREADY_WORKSPACE_MEMBER' })

    findPendingInvitationMock.mockResolvedValueOnce({ id: invitationId })
    await expect(
      invitationsService.createWorkspaceInvitation(workspaceId, ownerId, { email: 'invitee@example.com' })
    ).rejects.toMatchObject({ code: 'PENDING_INVITATION_EXISTS' })
  })

  it('maps a unique-index race to pending invitation conflict', async () => {
    const error = new Error('duplicate pending')
    createInvitationWithNotificationMock.mockRejectedValue(error)
    isUniqueConstraintErrorMock.mockReturnValue(true)

    await expect(
      invitationsService.createWorkspaceInvitation(workspaceId, ownerId, {
        email: 'invitee@example.com'
      })
    ).rejects.toMatchObject({ code: 'PENDING_INVITATION_EXISTS' })
  })

  it('accepts and declines only pending invitations and publishes notification updates', async () => {
    await expect(invitationsService.acceptWorkspaceInvitation(invitationId, inviteeId)).resolves.toMatchObject({
      status: 'ACCEPTED'
    })
    await expect(invitationsService.declineWorkspaceInvitation(invitationId, inviteeId)).resolves.toMatchObject({
      status: 'DECLINED'
    })
    expect(publishUpdatedNotificationMock).toHaveBeenCalledTimes(2)
  })

  it('expires stale invitations and returns 410', async () => {
    const expiredInvitation = {
      ...invitation,
      expiresAt: new Date('2020-01-01T00:00:00.000Z')
    }
    findInvitationForInviteeMock.mockResolvedValue(expiredInvitation)
    expireInvitationForInviteeMock.mockResolvedValue({
      invitation: { ...expiredInvitation, status: 'EXPIRED' },
      notification: { ...notification, readAt: createdAt }
    })

    await expect(invitationsService.acceptWorkspaceInvitation(invitationId, inviteeId)).rejects.toMatchObject({
      statusCode: 410,
      code: 'INVITATION_EXPIRED'
    })
    expect(publishUpdatedNotificationMock).toHaveBeenCalled()
  })

  it('hides invitations that do not belong to the requester and rejects processed invitations', async () => {
    findInvitationForInviteeMock.mockResolvedValueOnce(null)
    await expect(invitationsService.acceptWorkspaceInvitation(invitationId, inviteeId)).rejects.toMatchObject({
      statusCode: 404
    })

    findInvitationForInviteeMock.mockResolvedValueOnce({ ...invitation, status: 'DECLINED' })
    await expect(invitationsService.acceptWorkspaceInvitation(invitationId, inviteeId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'INVITATION_ALREADY_PROCESSED'
    })
  })

  it('keeps an already expired invitation on the 410 contract', async () => {
    findInvitationForInviteeMock.mockResolvedValue({ ...invitation, status: 'EXPIRED' })

    await expect(invitationsService.acceptWorkspaceInvitation(invitationId, inviteeId)).rejects.toMatchObject({
      statusCode: 410,
      code: 'INVITATION_EXPIRED'
    })
  })
})
