export type ProjectStatus = "DRAFT" | "ACTIVE" | "ARCHIVED"

export type ProjectMediaType = "VIDEO" | "AUDIO" | "IMAGE" | "SUBTITLE"

export type ProjectMediaStatus = "UPLOADING" | "UPLOADED" | "FAILED" | "DELETED"

export type ProjectMediaRole = "SOURCE" | "OVERLAY" | "AUDIO_BED" | "REFERENCE"

export type ProjectMediaSummary = {
  id: string
  type: ProjectMediaType
  title: string | null
  originalFilename: string
  duration: number | null
  mimeType: string | null
  width: number | null
  height: number | null
  status: ProjectMediaStatus
}

export type ProjectMedia = {
  id: string
  role: ProjectMediaRole
  createdAt: string
  media: ProjectMediaSummary
}

export type ProjectSummary = {
  id: string
  userId: string
  workspaceId: string
  sourceMediaId: string | null
  thumbnailMediaId: string | null
  title: string
  slug: string
  status: ProjectStatus
  aspectRatio: string
  duration: number | null
  sourceMedia: ProjectMediaSummary | null
  thumbnailMedia: ProjectMediaSummary | null
  createdAt: string
  updatedAt: string
}

export type ProjectDetail = ProjectSummary & {
  projectMedia: ProjectMedia[]
}

export type ProjectListMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
}

export type ProjectListResponse = {
  items: ProjectSummary[]
  meta: ProjectListMeta
}

export type ProjectListQuery = {
  page?: number
  limit?: number
  search?: string
  status?: ProjectStatus
  sortBy?: "createdAt" | "updatedAt" | "title"
  sortOrder?: "asc" | "desc"
}

export type CreateBlankProjectInput = {
  title: string
}

export type CreateProjectFromMediaInput = {
  mediaId: string
  title: string
}

export type UpdateProjectInput = {
  title?: string
  status?: ProjectStatus
}

export type StudioProjectSortKey = "recent" | "oldest" | "name"

export type StudioProjectCardData = ProjectSummary & {
  sourceLabel: string
  sourceType: "VIDEO" | "AUDIO" | null
  visualVariant: "teal" | "slate" | "olive" | "ember"
}
