import type { WorkspaceMemberRole } from '../../infrastructure/db/generated/prisma/client'

export interface WorkspaceOwnerData {
  id: string
  email: string
  fullName: string | null
}

export interface WorkspaceDetailData {
  id: string
  name: string
  slug: string
  owner: WorkspaceOwnerData
  createdAt: Date
}

export interface WorkspaceMemberData {
  userId: string
  email: string
  fullName: string | null
  role: WorkspaceMemberRole
  joinDate: Date
}

export interface WorkspaceListItemData {
  id: string
  name: string
  slug: string
  role: WorkspaceMemberRole
  createdAt: Date
}

export interface WorkspaceListData {
  items: WorkspaceListItemData[]
  preferredWorkspaceId: string | null
}

export interface WorkspaceMembershipRecord {
  workspaceId: string
  role: WorkspaceMemberRole
}

export interface UserWorkspaceMembershipRecord {
  role: WorkspaceMemberRole
  createdAt: Date
  workspace: {
    id: string
    name: string
    slug: string
    createdAt: Date
  }
}

export interface WorkspaceRecord {
  id: string
  name: string
  slug: string
  createdAt: Date
  owner: WorkspaceOwnerData
}

export interface WorkspaceMemberRecord {
  userId: string
  role: WorkspaceMemberRole
  createdAt: Date
  user: {
    email: string
    fullName: string | null
  }
}
