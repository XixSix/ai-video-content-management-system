import * as repo from './workspace.repository'
import type { WorkspaceContext } from '../auth/auth.types'
import type { WorkspaceDetailData, WorkspaceListData, WorkspaceMemberData } from './workspace.types'
import { WorkspaceError } from './workspace.error'

export const getWorkspaceMembershipContext = async (
  workspaceId: string,
  requesterId: string
): Promise<WorkspaceContext> => {
  const membership = await repo.findMembership(workspaceId, requesterId)

  if (!membership) {
    throw WorkspaceError.forbidden()
  }

  return {
    id: membership.workspaceId,
    role: membership.role
  }
}

export const getWorkspaceDetails = async (workspaceId: string, requesterId: string): Promise<WorkspaceDetailData> => {
  await getWorkspaceMembershipContext(workspaceId, requesterId)

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

export const listUserWorkspaces = async (userId: string): Promise<WorkspaceListData> => {
  const memberships = await repo.findUserWorkspaceMemberships(userId)
  const preferredWorkspaceId = await repo.findUserPreferredWorkspaceId(userId)
  const validPreferredWorkspaceId = memberships.some((membership) => membership.workspace.id === preferredWorkspaceId)
    ? preferredWorkspaceId
    : (memberships[0]?.workspace.id ?? null)

  if (validPreferredWorkspaceId && validPreferredWorkspaceId !== preferredWorkspaceId) {
    await repo.updateUserPreferredWorkspace(userId, validPreferredWorkspaceId)
  }

  return {
    items: memberships.map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      role: membership.role,
      createdAt: membership.workspace.createdAt
    })),
    preferredWorkspaceId: validPreferredWorkspaceId
  }
}

export const setPreferredWorkspace = async (workspaceId: string, userId: string): Promise<string> => {
  await getWorkspaceMembershipContext(workspaceId, userId)
  await repo.updateUserPreferredWorkspace(userId, workspaceId)

  return workspaceId
}

export const listWorkspaceMembers = async (
  workspaceId: string,
  requesterId: string
): Promise<WorkspaceMemberData[]> => {
  await getWorkspaceMembershipContext(workspaceId, requesterId)

  const members = await repo.findWorkspaceMembers(workspaceId)

  return members.map((m) => ({
    userId: m.userId,
    email: m.user.email,
    fullName: m.user.fullName,
    role: m.role,
    joinDate: m.createdAt
  }))
}
