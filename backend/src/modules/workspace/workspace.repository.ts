import { prisma } from '../../infrastructure/db/prisma'
import type { WorkspaceMemberRecord, WorkspaceRecord, WorkspaceMembershipRecord } from './workspace.types'

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
