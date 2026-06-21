import { prisma } from '../../infrastructure/db/prisma'
import {
  Prisma,
  ProjectMediaRole,
  ProjectStatus,
  type Media,
  type Project,
  type ProjectMedia
} from '../../infrastructure/db/generated/prisma/client'
import type { ProjectSortField, ProjectSummaryRecord, ProjectWithRelations, SortOrder } from './projects.types'

const projectDetailInclude = {
  sourceMedia: true,
  thumbnailMedia: true,
  projectMedia: {
    include: {
      media: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  }
} satisfies Prisma.ProjectInclude

const projectSummaryInclude = {
  sourceMedia: true,
  thumbnailMedia: true
} satisfies Prisma.ProjectInclude

export interface ListProjectsFilters {
  workspaceId: string
  search?: string
  status?: ProjectStatus
}

const buildProjectWhere = (filters: ListProjectsFilters): Prisma.ProjectWhereInput => ({
  workspaceId: filters.workspaceId,
  status: filters.status ?? {
    not: ProjectStatus.DELETED
  },
  ...(filters.search
    ? {
        OR: [
          {
            title: {
              contains: filters.search,
              mode: 'insensitive'
            }
          },
          {
            sourceMedia: {
              is: {
                originalFilename: {
                  contains: filters.search,
                  mode: 'insensitive'
                }
              }
            }
          }
        ]
      }
    : {})
})

export const listProjects = async (
  filters: ListProjectsFilters,
  skip: number,
  take: number,
  sortBy: ProjectSortField,
  sortOrder: SortOrder
): Promise<[ProjectSummaryRecord[], number]> => {
  const where = buildProjectWhere(filters)

  return Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: projectSummaryInclude
    }),
    prisma.project.count({ where })
  ])
}

export const findProjectById = async (id: string): Promise<Project | null> =>
  prisma.project.findUnique({
    where: { id }
  })

export const findWorkspaceAccessibleProjectById = async (
  id: string,
  workspaceId: string
): Promise<ProjectWithRelations | null> =>
  prisma.project.findFirst({
    where: {
      id,
      workspaceId
    },
    include: projectDetailInclude
  })

export const findWorkspaceMediaById = async (id: string, workspaceId: string): Promise<Media | null> =>
  prisma.media.findFirst({
    where: {
      id,
      workspaceId
    }
  })

export const createBlankProject = async (data: Prisma.ProjectUncheckedCreateInput): Promise<ProjectWithRelations> =>
  prisma.project.create({
    data,
    include: projectDetailInclude
  })

export const createProjectFromMedia = async (
  projectData: Prisma.ProjectUncheckedCreateInput,
  mediaId: string
): Promise<ProjectWithRelations> =>
  prisma.$transaction(async (transaction) => {
    const project = await transaction.project.create({
      data: projectData
    })

    await transaction.projectMedia.create({
      data: {
        projectId: project.id,
        mediaId,
        role: ProjectMediaRole.SOURCE
      }
    })

    return transaction.project.findUniqueOrThrow({
      where: { id: project.id },
      include: projectDetailInclude
    })
  })

export const updateProject = async (
  id: string,
  data: Prisma.ProjectUncheckedUpdateInput
): Promise<ProjectWithRelations> =>
  prisma.project.update({
    where: { id },
    data,
    include: projectDetailInclude
  })

export const replaceSourceMedia = async (projectId: string, media: Media): Promise<ProjectWithRelations> =>
  prisma.$transaction(async (transaction) => {
    await transaction.projectMedia.deleteMany({
      where: {
        projectId,
        OR: [{ role: ProjectMediaRole.SOURCE }, { mediaId: media.id }]
      }
    })

    await transaction.projectMedia.create({
      data: {
        projectId,
        mediaId: media.id,
        role: ProjectMediaRole.SOURCE
      }
    })

    return transaction.project.update({
      where: { id: projectId },
      data: {
        sourceMediaId: media.id,
        duration: media.duration
      },
      include: projectDetailInclude
    })
  })

export const createProjectMedia = async (
  projectId: string,
  mediaId: string,
  role: ProjectMediaRole
): Promise<ProjectMedia & { media: Media }> =>
  prisma.projectMedia.create({
    data: {
      projectId,
      mediaId,
      role
    },
    include: {
      media: true
    }
  })

export const findProjectMediaById = async (id: string): Promise<ProjectMedia | null> =>
  prisma.projectMedia.findUnique({
    where: { id }
  })

export const deleteProjectMedia = async (id: string): Promise<void> => {
  await prisma.projectMedia.delete({
    where: { id }
  })
}

export const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
