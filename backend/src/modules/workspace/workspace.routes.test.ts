import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from '../auth/auth.types'
import { WorkspaceError } from './workspace.error'
import type { WorkspaceDetailData, WorkspaceMemberData } from './workspace.types'

const getAuthenticatedUserMock = jest.fn<(accessToken: string) => Promise<AuthenticatedUser>>()
const getWorkspaceDetailsMock = jest.fn<(workspaceId: string, requesterId: string) => Promise<WorkspaceDetailData>>()
const listWorkspaceMembersMock = jest.fn<(workspaceId: string, requesterId: string) => Promise<WorkspaceMemberData[]>>()

jest.unstable_mockModule('../auth/auth.service', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock
}))

jest.unstable_mockModule('./workspace.service', () => ({
  getWorkspaceDetails: getWorkspaceDetailsMock,
  listWorkspaceMembers: listWorkspaceMembersMock
}))

const { app } = await import('../../app')

const userId = '00000000-0000-4000-8000-000000000001'
const workspaceId = '00000000-0000-4000-8000-000000000002'
const ownerId = '00000000-0000-4000-8000-000000000003'
const createdAt = new Date('2026-06-21T10:00:00.000Z')

const authenticatedUser: AuthenticatedUser = {
  id: userId,
  email: 'member@example.com',
  role: 'USER',
  status: 'ACTIVE'
}

const workspace: WorkspaceDetailData = {
  id: workspaceId,
  name: 'Creator Workspace',
  slug: 'creator-workspace',
  owner: {
    id: ownerId,
    email: 'owner@example.com',
    fullName: 'Workspace Owner'
  },
  createdAt
}

const members: WorkspaceMemberData[] = [
  {
    userId: ownerId,
    email: 'owner@example.com',
    fullName: 'Workspace Owner',
    role: 'OWNER',
    joinDate: createdAt
  }
]

beforeEach(() => {
  jest.resetAllMocks()
  getAuthenticatedUserMock.mockResolvedValue(authenticatedUser)
  getWorkspaceDetailsMock.mockResolvedValue(workspace)
  listWorkspaceMembersMock.mockResolvedValue(members)
})

describe('workspace routes', () => {
  it.each([`/api/v1/workspaces/${workspaceId}`, `/api/v1/workspaces/${workspaceId}/members`])(
    'requires an access token for GET %s',
    async (path) => {
      const response = await request(app).get(path)

      expect(response.status).toBe(401)
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      })
    }
  )

  it('returns workspace details with the consistent response envelope', async () => {
    const response = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        workspace: {
          ...workspace,
          createdAt: createdAt.toISOString()
        }
      }
    })
    expect(getWorkspaceDetailsMock).toHaveBeenCalledWith(workspaceId, userId)
  })

  it('returns workspace members with serialized join dates', async () => {
    const response = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        members: [
          {
            ...members[0],
            joinDate: createdAt.toISOString()
          }
        ]
      }
    })
    expect(listWorkspaceMembersMock).toHaveBeenCalledWith(workspaceId, userId)
  })

  it.each(['/api/v1/workspaces/not-a-uuid', '/api/v1/workspaces/not-a-uuid/members'])(
    'validates workspace IDs before calling the service for GET %s',
    async (path) => {
      const response = await request(app).get(path).set('Authorization', 'Bearer access-token')

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed'
        }
      })
      expect(getWorkspaceDetailsMock).not.toHaveBeenCalled()
      expect(listWorkspaceMembersMock).not.toHaveBeenCalled()
    }
  )

  it.each([
    ['details', `/api/v1/workspaces/${workspaceId}`, getWorkspaceDetailsMock],
    ['members', `/api/v1/workspaces/${workspaceId}/members`, listWorkspaceMembersMock]
  ])('returns a consistent forbidden response for inaccessible workspace %s', async (_label, path, serviceMock) => {
    serviceMock.mockRejectedValue(WorkspaceError.forbidden())

    const response = await request(app).get(path).set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(403)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You are not a member of this workspace'
      }
    })
  })
})
