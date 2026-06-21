import * as repo from './workspace.repository'
import type { WorkspaceDetailData, WorkspaceMemberData } from './workspace.types'
import { WorkspaceError } from './workspace.error'

export const getWorkspaceDetails = async (workspaceId: string, requesterId: string): Promise<WorkspaceDetailData> => {
  const membership = await repo.findMembership(workspaceId, requesterId)

  if (!membership) {
    throw WorkspaceError.forbidden()
  }

  const workspace = await repo.findWorkspaceById(workspaceId)

  if (!workspace) {
    throw WorkspaceError.forbidden()
  }

  const { owner } = workspace

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    owner: {
      id: owner.id,
      email: owner.email,
      fullName: owner.fullName
    },
    createdAt: workspace.createdAt
  }
}

export const listWorkspaceMembers = async (
  workspaceId: string,
  requesterId: string
): Promise<WorkspaceMemberData[]> => {
  const membership = await repo.findMembership(workspaceId, requesterId)

  if (!membership) {
    throw WorkspaceError.forbidden()
  }

  const members = await repo.findWorkspaceMembers(workspaceId)

  return members.map((m) => ({
    userId: m.userId,
    email: m.user.email,
    fullName: m.user.fullName,
    role: m.role,
    joinDate: m.createdAt
  }))
}
