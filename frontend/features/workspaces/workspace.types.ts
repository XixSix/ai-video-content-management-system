export type WorkspaceRole = "OWNER" | "MEMBER"

export type WorkspaceListItem = {
  id: string
  name: string
  slug: string
  role: WorkspaceRole
  createdAt: string
}

export type WorkspaceListData = {
  items: WorkspaceListItem[]
  preferredWorkspaceId: string | null
}

export type WorkspaceOwner = {
  id: string
  email: string
  fullName: string | null
}

export type WorkspaceDetail = {
  id: string
  name: string
  slug: string
  owner: WorkspaceOwner
  createdAt: string
}

export type WorkspaceMember = {
  userId: string
  email: string
  fullName: string | null
  role: WorkspaceRole
  joinDate: string
}

export type WorkspaceInvitation = {
  id: string
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED"
  expiresAt: string
  respondedAt: string | null
  createdAt: string
  updatedAt: string
  workspace: {
    id: string
    name: string
    slug: string
  }
  inviter: WorkspaceOwner
  invitee: WorkspaceOwner
}
