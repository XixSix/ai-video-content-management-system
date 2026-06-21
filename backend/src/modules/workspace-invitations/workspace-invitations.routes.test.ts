import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from '../auth/auth.types'
import { WorkspaceInvitationsError } from './workspace-invitations.error'
import type { WorkspaceInvitationData } from './workspace-invitations.types'

const getAuthenticatedUserMock = jest.fn<(accessToken: string) => Promise<AuthenticatedUser>>()
const createWorkspaceInvitationMock = jest.fn()
const acceptWorkspaceInvitationMock = jest.fn()
const declineWorkspaceInvitationMock = jest.fn()

jest.unstable_mockModule('../auth/auth.service', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock
}))

jest.unstable_mockModule('./workspace-invitations.service', () => ({
  createWorkspaceInvitation: createWorkspaceInvitationMock,
  acceptWorkspaceInvitation: acceptWorkspaceInvitationMock,
  declineWorkspaceInvitation: declineWorkspaceInvitationMock
}))

const { app } = await import('../../app')

const userId = '00000000-0000-4000-8000-000000000001'
const workspaceId = '00000000-0000-4000-8000-000000000002'
const invitationId = '00000000-0000-4000-8000-000000000003'
const createdAt = new Date('2026-06-21T10:00:00.000Z')
const expiresAt = new Date('2026-06-28T10:00:00.000Z')

const user: AuthenticatedUser = {
  id: userId,
  email: 'user@example.com',
  role: 'USER',
  status: 'ACTIVE'
}

const invitation: WorkspaceInvitationData = {
  id: invitationId,
  status: 'PENDING',
  expiresAt,
  respondedAt: null,
  createdAt,
  updatedAt: createdAt,
  workspace: {
    id: workspaceId,
    name: 'Creator Workspace',
    slug: 'creator-workspace'
  },
  inviter: {
    id: userId,
    email: 'owner@example.com',
    fullName: 'Owner'
  },
  invitee: {
    id: '00000000-0000-4000-8000-000000000004',
    email: 'invitee@example.com',
    fullName: null
  }
}

beforeEach(() => {
  jest.resetAllMocks()
  getAuthenticatedUserMock.mockResolvedValue(user)
  createWorkspaceInvitationMock.mockResolvedValue(invitation)
  acceptWorkspaceInvitationMock.mockResolvedValue({ ...invitation, status: 'ACCEPTED' })
  declineWorkspaceInvitationMock.mockResolvedValue({ ...invitation, status: 'DECLINED' })
})

describe('workspace invitation routes', () => {
  it.each([
    ['post', `/api/v1/workspaces/${workspaceId}/invitations`],
    ['post', `/api/v1/workspace-invitations/${invitationId}/accept`],
    ['post', `/api/v1/workspace-invitations/${invitationId}/decline`]
  ] as const)('%s %s requires an access token', async (method, path) => {
    const response = await request(app)[method](path).send({})
    expect(response.status).toBe(401)
  })

  it('normalizes email and creates an invitation', async () => {
    const response = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', 'Bearer access-token')
      .send({ email: '  INVITEE@EXAMPLE.COM ' })

    expect(response.status).toBe(201)
    expect(createWorkspaceInvitationMock).toHaveBeenCalledWith(workspaceId, userId, {
      email: 'invitee@example.com'
    })
    expect(response.body.data.invitation).toMatchObject({
      id: invitationId,
      status: 'PENDING',
      expiresAt: expiresAt.toISOString()
    })
  })

  it.each([
    ['accept', acceptWorkspaceInvitationMock, 'ACCEPTED'],
    ['decline', declineWorkspaceInvitationMock, 'DECLINED']
  ] as const)('%s responds to an invitation', async (action, serviceMock, status) => {
    const response = await request(app)
      .post(`/api/v1/workspace-invitations/${invitationId}/${action}`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(serviceMock).toHaveBeenCalledWith(invitationId, userId)
    expect(response.body.data.invitation.status).toBe(status)
  })

  it('validates UUIDs and invite email before calling services', async () => {
    const invalidId = await request(app)
      .post('/api/v1/workspaces/not-a-uuid/invitations')
      .set('Authorization', 'Bearer access-token')
      .send({ email: 'invitee@example.com' })
    const invalidEmail = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', 'Bearer access-token')
      .send({ email: 'invalid' })

    expect(invalidId.status).toBe(400)
    expect(invalidEmail.status).toBe(400)
    expect(createWorkspaceInvitationMock).not.toHaveBeenCalled()
  })

  it('returns invitation domain errors consistently', async () => {
    acceptWorkspaceInvitationMock.mockRejectedValue(WorkspaceInvitationsError.expired())

    const response = await request(app)
      .post(`/api/v1/workspace-invitations/${invitationId}/accept`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(410)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVITATION_EXPIRED'
      }
    })
  })
})
