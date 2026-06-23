import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const findUniqueMembershipMock = jest.fn()
const findUniqueWorkspaceMock = jest.fn()
const findManyMembersMock = jest.fn()
const findUniqueUserMock = jest.fn()
const updateUserMock = jest.fn()

jest.unstable_mockModule('../../infrastructure/db/prisma', () => ({
  prisma: {
    workspaceMember: {
      findUnique: findUniqueMembershipMock,
      findMany: findManyMembersMock
    },
    workspace: {
      findUnique: findUniqueWorkspaceMock
    },
    user: {
      findUnique: findUniqueUserMock,
      update: updateUserMock
    }
  }
}))

const workspaceRepository = await import('./workspace.repository')

const workspaceId = '00000000-0000-4000-8000-000000000001'
const userId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => {
  jest.resetAllMocks()
})

describe('workspace repository', () => {
  it('finds membership by the workspace and user composite key with a minimal projection', async () => {
    findUniqueMembershipMock.mockResolvedValue({ workspaceId, role: 'MEMBER' })

    await workspaceRepository.findMembership(workspaceId, userId)

    expect(findUniqueMembershipMock).toHaveBeenCalledWith({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId
        }
      },
      select: {
        workspaceId: true,
        role: true
      }
    })
  })

  it('selects only workspace detail fields and safe owner fields', async () => {
    findUniqueWorkspaceMock.mockResolvedValue(null)

    await workspaceRepository.findWorkspaceById(workspaceId)

    expect(findUniqueWorkspaceMock).toHaveBeenCalledWith({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        }
      }
    })
  })

  it('selects safe member fields in join order', async () => {
    findManyMembersMock.mockResolvedValue([])

    await workspaceRepository.findWorkspaceMembers(workspaceId)

    expect(findManyMembersMock).toHaveBeenCalledWith({
      where: { workspaceId },
      select: {
        userId: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            fullName: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
  })

  it('lists user workspace memberships in stable join order', async () => {
    findManyMembersMock.mockResolvedValue([])

    await workspaceRepository.findUserWorkspaceMemberships(userId)

    expect(findManyMembersMock).toHaveBeenCalledWith({
      where: { userId },
      select: {
        role: true,
        createdAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true
          }
        }
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    })
  })

  it('reads and updates the preferred workspace', async () => {
    findUniqueUserMock.mockResolvedValue({ preferredWorkspaceId: workspaceId })
    updateUserMock.mockResolvedValue({})

    await expect(workspaceRepository.findUserPreferredWorkspaceId(userId)).resolves.toBe(workspaceId)
    await workspaceRepository.updateUserPreferredWorkspace(userId, workspaceId)

    expect(updateUserMock).toHaveBeenCalledWith({
      where: { id: userId },
      data: { preferredWorkspaceId: workspaceId }
    })
  })
})
