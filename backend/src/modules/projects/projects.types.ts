import type {
  MediaStatus,
  MediaType,
  Prisma,
  ProjectMediaRole,
  ProjectStatus
} from '../../infrastructure/db/generated/prisma/client'

export type ProjectSortField = 'createdAt' | 'updatedAt' | 'title'
export type SortOrder = 'asc' | 'desc'

export interface ProjectMediaData {
  id: string
  role: ProjectMediaRole
  createdAt: Date
  media: ProjectMediaSummary
}

export interface ProjectMediaSummary {
  id: string
  type: MediaType
  title: string | null
  originalFilename: string
  duration: number | null
  mimeType: string | null
  width: number | null
  height: number | null
  status: MediaStatus
}

export interface ProjectSummaryData {
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
  createdAt: Date
  updatedAt: Date
}

export interface ProjectDetailData extends ProjectSummaryData {
  projectMedia: ProjectMediaData[]
}

export interface PaginatedResult<TItem> {
  items: TItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    sourceMedia: true
    thumbnailMedia: true
    projectMedia: {
      include: {
        media: true
      }
    }
  }
}>

export type ProjectSummaryRecord = Prisma.ProjectGetPayload<{
  include: {
    sourceMedia: true
    thumbnailMedia: true
  }
}>
