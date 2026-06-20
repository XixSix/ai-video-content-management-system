import type { Media } from '../../infrastructure/db/generated/prisma/client'
import type {
  ProjectDetailData,
  ProjectMediaData,
  ProjectMediaSummary,
  ProjectSummaryData,
  ProjectSummaryRecord,
  ProjectWithRelations
} from './projects.types'

const toProjectMediaSummary = (media: Media): ProjectMediaSummary => ({
  id: media.id,
  type: media.type,
  title: media.title,
  originalFilename: media.originalFilename,
  duration: media.duration,
  mimeType: media.mimeType,
  width: media.width,
  height: media.height,
  status: media.status
})

export const toProjectSummaryData = (project: ProjectSummaryRecord): ProjectSummaryData => ({
  id: project.id,
  userId: project.userId,
  workspaceId: project.workspaceId,
  sourceMediaId: project.sourceMediaId,
  thumbnailMediaId: project.thumbnailMediaId,
  title: project.title,
  slug: project.slug,
  status: project.status,
  aspectRatio: project.aspectRatio,
  duration: project.duration,
  sourceMedia: project.sourceMedia ? toProjectMediaSummary(project.sourceMedia) : null,
  thumbnailMedia: project.thumbnailMedia ? toProjectMediaSummary(project.thumbnailMedia) : null,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt
})

export const toProjectDetailData = (project: ProjectWithRelations): ProjectDetailData => ({
  ...toProjectSummaryData(project),
  projectMedia: project.projectMedia.map(
    (item): ProjectMediaData => ({
      id: item.id,
      role: item.role,
      createdAt: item.createdAt,
      media: toProjectMediaSummary(item.media)
    })
  )
})
