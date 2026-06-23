import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type {
  UserWorkspaceMembershipRecord,
  WorkspaceMemberRecord,
  WorkspaceMembershipRecord,
  WorkspaceRecord
} from './workspace.types'

const findMembershipMock = jest.fn<(workspaceId: string, userId: string) => Promise<WorkspaceMembershipRecord | null>>()
const findWorkspaceByIdMock = jest.fn<(workspaceId: string) => Promise<WorkspaceRecord | null>>()
const findWorkspaceMembersMock = jest.fn<(workspaceId: string) => Promise<WorkspaceMemberRecord[]>>()
const findUserWorkspaceMembershipsMock = jest.fn<(userId: string) => Promise<UserWorkspaceMembershipRecord[]>>()
const findUserPreferredWorkspaceIdMock = jest.fn<(userId: string) => Promise<string | null>>()
const updateUserPreferredWorkspaceMock = jest.fn<(userId: string, workspaceId: string) => Promise<void>>()

jest.unstable_mockModule('./workspace.repository', () => ({
  findMembership: findMembershipMock,
  findWorkspaceById: findWorkspaceByIdMock,
  findWorkspaceMembers: findWorkspaceMembersMock,
  findUserWorkspaceMemberships: findUserWorkspaceMembershipsMock,
  findUserPreferredWorkspaceId: findUserPreferredWorkspaceIdMock,
  updateUserPreferredWorkspace: updateUserPreferredWorkspaceMock
}))

const workspaceService = await import('./workspace.service')

const workspaceId = '00000000-0000-4000-8000-000000000001'
const requesterId = '00000000-0000-4000-8000-000000000002'
const ownerId = '00000000-0000-4000-8000-000000000003'
const memberId = '00000000-0000-4000-8000-000000000004'
const createdAt = new Date('2026-06-21T10:00:00.000Z')
const memberJoinedAt = new Date('2026-06-21T11:00:00.000Z')

const workspace: WorkspaceRecord = {
  id: workspaceId,
  name: 'Creator Workspace',
  slug: 'creator-workspace',
  createdAt,
  owner: {
    id: ownerId,
    email: 'owner@example.com',
    fullName: 'Workspace Owner'
  }
}

const members: WorkspaceMemberRecord[] = [
  {
    userId: ownerId,
    role: 'OWNER',
    createdAt,
    user: {
      email: 'owner@example.com',
      fullName: 'Workspace Owner'
    }
  },
  {
    userId: memberId,
    role: 'MEMBER',
    createdAt: memberJoinedAt,
    user: {
      email: 'member@example.com',
      fullName: null
    }
  }
]

beforeEach(() => {
  jest.resetAllMocks()
  findMembershipMock.mockResolvedValue({
    workspaceId,
    role: 'MEMBER'
  })
  findWorkspaceByIdMock.mockResolvedValue(workspace)
  findWorkspaceMembersMock.mockResolvedValue(members)
  findUserWorkspaceMembershipsMock.mockResolvedValue([
    {
      role: 'MEMBER',
      createdAt,
      workspace: {
        id: workspaceId,
        name: workspace.name,
        slug: workspace.slug,
        createdAt
      }
    }
  ])
  findUserPreferredWorkspaceIdMock.mockResolvedValue(workspaceId)
  updateUserPreferredWorkspaceMock.mockResolvedValue()
})

describe('workspace service', () => {
  it('lists user workspaces with the preferred workspace', async () => {
    await expect(workspaceService.listUserWorkspaces(requesterId)).resolves.toEqual({
      items: [
        {
          id: workspaceId,
          name: workspace.name,
          slug: workspace.slug,
          role: 'MEMBER',
          createdAt
        }
      ],
      preferredWorkspaceId: workspaceId
    })
    expect(updateUserPreferredWorkspaceMock).not.toHaveBeenCalled()
  })

  it('repairs an inaccessible preferred workspace with the oldest membership', async () => {
    findUserPreferredWorkspaceIdMock.mockResolvedValue('00000000-0000-4000-8000-000000000099')

    await expect(workspaceService.listUserWorkspaces(requesterId)).resolves.toMatchObject({
      preferredWorkspaceId: workspaceId
    })
    expect(updateUserPreferredWorkspaceMock).toHaveBeenCalledWith(requesterId, workspaceId)
  })

  it('sets the preferred workspace only for a member', async () => {
    await expect(workspaceService.setPreferredWorkspace(workspaceId, requesterId)).resolves.toBe(workspaceId)
    expect(updateUserPreferredWorkspaceMock).toHaveBeenCalledWith(requesterId, workspaceId)

    findMembershipMock.mockResolvedValue(null)
    await expect(workspaceService.setPreferredWorkspace(workspaceId, requesterId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })
  })

  it('returns the selected workspace membership context', async () => {
    await expect(workspaceService.getWorkspaceMembershipContext(workspaceId, requesterId)).resolves.toEqual({
      id: workspaceId,
      role: 'MEMBER'
    })
  })

  it('returns workspace details for a member', async () => {
    await expect(workspaceService.getWorkspaceDetails(workspaceId, requesterId)).resolves.toEqual({
      id: workspaceId,
      name: 'Creator Workspace',
      slug: 'creator-workspace',
      owner: {
        id: ownerId,
        email: 'owner@example.com',
        fullName: 'Workspace Owner'
      },
      createdAt
    })
    expect(findMembershipMock).toHaveBeenCalledWith(workspaceId, requesterId)
  })

  it('returns mapped workspace members for a member', async () => {
    await expect(workspaceService.listWorkspaceMembers(workspaceId, requesterId)).resolves.toEqual([
      {
        userId: ownerId,
        email: 'owner@example.com',
        fullName: 'Workspace Owner',
        role: 'OWNER',
        joinDate: createdAt
      },
      {
        userId: memberId,
        email: 'member@example.com',
        fullName: null,
        role: 'MEMBER',
        joinDate: memberJoinedAt
      }
    ])
  })

  it.each([
    ['workspace details', () => workspaceService.getWorkspaceDetails(workspaceId, requesterId)],
    ['workspace members', () => workspaceService.listWorkspaceMembers(workspaceId, requesterId)]
  ])('rejects non-members before reading %s', async (_label, action) => {
    findMembershipMock.mockResolvedValue(null)

    await expect(action()).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })
    expect(findWorkspaceByIdMock).not.toHaveBeenCalled()
    expect(findWorkspaceMembersMock).not.toHaveBeenCalled()
  })

  it('returns forbidden when the workspace disappears after membership validation', async () => {
    findWorkspaceByIdMock.mockResolvedValue(null)

    await expect(workspaceService.getWorkspaceDetails(workspaceId, requesterId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })
  })
})
