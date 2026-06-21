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

export interface WorkspaceMembershipRecord {
  id: string
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
