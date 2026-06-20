import {
  MediaStatus,
  MediaType,
  ProjectMediaRole,
  ProjectStatus,
  type Media,
  type Project
} from '../../infrastructure/db/generated/prisma/client'
import type {
  AddProjectMediaBody,
  CreateBlankProjectBody,
  CreateProjectFromMediaBody,
  ListProjectsQuery,
  SetProjectSourceMediaBody,
  UpdateProjectBody
} from './projects.schema'
import { ProjectsError } from './projects.error'
import { toProjectDetailData, toProjectSummaryData } from './projects.mapper'
import * as projectsRepo from './projects.repository'
import type { PaginatedResult, ProjectDetailData, ProjectMediaData, ProjectSummaryData } from './projects.types'
import { createProjectSlug, getClosestProjectAspectRatio } from './projects.util'

const getReadableProject = async (workspaceId: string, projectId: string) => {
  const project = await projectsRepo.findWorkspaceAccessibleProjectById(projectId, workspaceId)

  if (!project || project.status === ProjectStatus.DELETED) {
    throw ProjectsError.notFound()
  }

  return project
}

const getCreatorOwnedProject = async (
  userId: string,
  workspaceId: string,
  projectId: string,
  allowDeleted = false
): Promise<Project> => {
  const project = await projectsRepo.findProjectById(projectId)

  if (!project || project.workspaceId !== workspaceId || (!allowDeleted && project.status === ProjectStatus.DELETED)) {
    throw ProjectsError.notFound()
  }

  if (project.userId !== userId) {
    throw ProjectsError.forbidden()
  }

  return project
}

const getUploadedWorkspaceMedia = async (workspaceId: string, mediaId: string): Promise<Media> => {
  const media = await projectsRepo.findWorkspaceMediaById(mediaId, workspaceId)

  if (!media || media.status === MediaStatus.DELETED) {
    throw ProjectsError.mediaNotFound()
  }

  if (media.status !== MediaStatus.UPLOADED) {
    throw ProjectsError.invalidMedia(`Media in status ${media.status} cannot be attached to a project`)
  }

  return media
}

const ensureSourceMedia = (media: Media): void => {
  if (media.type !== MediaType.VIDEO && media.type !== MediaType.AUDIO) {
    throw ProjectsError.invalidMedia('Project source media must be video or audio')
  }
}

const getProjectMediaRole = (media: Media): ProjectMediaRole => {
  if (media.type === MediaType.AUDIO) {
    return ProjectMediaRole.AUDIO_BED
  }

  if (media.type === MediaType.VIDEO || media.type === MediaType.IMAGE) {
    return ProjectMediaRole.OVERLAY
  }

  throw ProjectsError.invalidMedia('Only video, image, or audio media can be added to a project')
}

export const listProjects = async (
  workspaceId: string,
  query: ListProjectsQuery
): Promise<PaginatedResult<ProjectSummaryData>> => {
  const page = query.page
  const limit = query.limit
  const skip = (page - 1) * limit
  const [items, total] = await projectsRepo.listProjects(
    {
      workspaceId,
      search: query.search,
      status: query.status
    },
    skip,
    limit,
    query.sortBy,
    query.sortOrder
  )

  return {
    items: items.map(toProjectSummaryData),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
}

export const getProject = async (workspaceId: string, projectId: string): Promise<ProjectDetailData> =>
  toProjectDetailData(await getReadableProject(workspaceId, projectId))

export const createBlankProject = async (
  userId: string,
  workspaceId: string,
  body: CreateBlankProjectBody
): Promise<ProjectDetailData> => {
  const project = await projectsRepo.createBlankProject({
    userId,
    workspaceId,
    title: body.title,
    slug: createProjectSlug(body.title),
    status: ProjectStatus.DRAFT
  })

  return toProjectDetailData(project)
}

export const createProjectFromMedia = async (
  userId: string,
  workspaceId: string,
  body: CreateProjectFromMediaBody
): Promise<ProjectDetailData> => {
  const media = await getUploadedWorkspaceMedia(workspaceId, body.mediaId)
  ensureSourceMedia(media)
  const aspectRatio =
    media.width !== null && media.height !== null ? getClosestProjectAspectRatio(media.width, media.height) : undefined

  if (media.type === MediaType.VIDEO && aspectRatio === undefined) {
    throw ProjectsError.invalidMedia('Video width and height are required to create a project')
  }

  const project = await projectsRepo.createProjectFromMedia(
    {
      userId,
      workspaceId,
      sourceMediaId: media.id,
      title: body.title,
      slug: createProjectSlug(body.title),
      ...(aspectRatio !== undefined ? { aspectRatio } : {}),
      duration: media.duration,
      status: ProjectStatus.DRAFT
    },
    media.id
  )

  return toProjectDetailData(project)
}

export const updateProject = async (
  userId: string,
  workspaceId: string,
  projectId: string,
  body: UpdateProjectBody
): Promise<ProjectDetailData> => {
  await getCreatorOwnedProject(userId, workspaceId, projectId)

  const project = await projectsRepo.updateProject(projectId, {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.status !== undefined ? { status: body.status } : {})
  })

  return toProjectDetailData(project)
}

export const deleteProject = async (userId: string, workspaceId: string, projectId: string): Promise<void> => {
  const project = await getCreatorOwnedProject(userId, workspaceId, projectId, true)

  if (project.status === ProjectStatus.DELETED) {
    return
  }

  await projectsRepo.updateProject(project.id, {
    status: ProjectStatus.DELETED
  })
}

export const setSourceMedia = async (
  userId: string,
  workspaceId: string,
  projectId: string,
  body: SetProjectSourceMediaBody
): Promise<ProjectDetailData> => {
  await getCreatorOwnedProject(userId, workspaceId, projectId)
  const media = await getUploadedWorkspaceMedia(workspaceId, body.mediaId)
  ensureSourceMedia(media)

  return toProjectDetailData(await projectsRepo.replaceSourceMedia(projectId, media))
}

export const addProjectMedia = async (
  userId: string,
  workspaceId: string,
  projectId: string,
  body: AddProjectMediaBody
): Promise<ProjectMediaData> => {
  await getCreatorOwnedProject(userId, workspaceId, projectId)
  const media = await getUploadedWorkspaceMedia(workspaceId, body.mediaId)
  const role = getProjectMediaRole(media)

  try {
    const projectMedia = await projectsRepo.createProjectMedia(projectId, media.id, role)

    return {
      id: projectMedia.id,
      role: projectMedia.role,
      createdAt: projectMedia.createdAt,
      media: {
        id: media.id,
        type: media.type,
        title: media.title,
        originalFilename: media.originalFilename,
        duration: media.duration,
        mimeType: media.mimeType,
        width: media.width,
        height: media.height,
        status: media.status
      }
    }
  } catch (error: unknown) {
    if (projectsRepo.isUniqueConstraintError(error)) {
      throw ProjectsError.duplicateMedia()
    }

    throw error
  }
}

export const removeProjectMedia = async (
  userId: string,
  workspaceId: string,
  projectId: string,
  projectMediaId: string
): Promise<void> => {
  await getCreatorOwnedProject(userId, workspaceId, projectId)
  const projectMedia = await projectsRepo.findProjectMediaById(projectMediaId)

  if (!projectMedia || projectMedia.projectId !== projectId) {
    throw ProjectsError.mediaNotFound()
  }

  if (projectMedia.role === ProjectMediaRole.SOURCE) {
    throw ProjectsError.invalidMedia('Source media must be changed through the source-media endpoint')
  }

  await projectsRepo.deleteProjectMedia(projectMedia.id)
}
