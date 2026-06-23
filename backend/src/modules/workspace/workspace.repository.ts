import { prisma } from '../../infrastructure/db/prisma'
import type {
  UserWorkspaceMembershipRecord,
  WorkspaceMemberRecord,
  WorkspaceRecord,
  WorkspaceMembershipRecord
} from './workspace.types'

export const findMembership = async (workspaceId: string, userId: string): Promise<WorkspaceMembershipRecord | null> =>
  prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: {
      workspaceId: true,
      role: true
    }
  })

export const findWorkspaceById = async (workspaceId: string): Promise<WorkspaceRecord | null> =>
  prisma.workspace.findUnique({
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

export const findWorkspaceMembers = async (workspaceId: string): Promise<WorkspaceMemberRecord[]> =>
  prisma.workspaceMember.findMany({
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
    orderBy: { createdAt: 'asc' }
  })

export const findUserWorkspaceMemberships = async (userId: string): Promise<UserWorkspaceMembershipRecord[]> =>
  prisma.workspaceMember.findMany({
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

export const findUserPreferredWorkspaceId = async (userId: string): Promise<string | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredWorkspaceId: true }
  })

  return user?.preferredWorkspaceId ?? null
}

export const updateUserPreferredWorkspace = async (userId: string, workspaceId: string): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { preferredWorkspaceId: workspaceId }
  })
}
