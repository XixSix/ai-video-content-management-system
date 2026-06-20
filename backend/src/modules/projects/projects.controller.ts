import type {
  BodyRequestHandler,
  ParamsBodyRequestHandler,
  ParamsRequestHandler,
  QueryRequestHandler
} from '../../types/express'
import { sendSuccess } from '../../utils/response'
import type {
  AddProjectMediaBody,
  CreateBlankProjectBody,
  CreateProjectFromMediaBody,
  ListProjectsQuery,
  ProjectMediaParams,
  ProjectParams,
  SetProjectSourceMediaBody,
  UpdateProjectBody
} from './projects.schema'
import * as projectsService from './projects.service'
import type { PaginatedResult, ProjectDetailData, ProjectMediaData, ProjectSummaryData } from './projects.types'

export const list: QueryRequestHandler<ListProjectsQuery> = async (req, res, next): Promise<void> => {
  try {
    const result = await projectsService.listProjects(req.workspace!.id, req.query as ListProjectsQuery)

    sendSuccess<{ items: ProjectSummaryData[]; meta: Omit<PaginatedResult<never>, 'items'> }>(res, {
      items: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    })
  } catch (error: unknown) {
    next(error)
  }
}

export const get: ParamsRequestHandler<ProjectParams> = async (req, res, next): Promise<void> => {
  try {
    const project = await projectsService.getProject(req.workspace!.id, req.params.projectId)

    sendSuccess<{ project: ProjectDetailData }>(res, { project })
  } catch (error: unknown) {
    next(error)
  }
}

export const createBlank: BodyRequestHandler<CreateBlankProjectBody> = async (req, res, next): Promise<void> => {
  try {
    const project = await projectsService.createBlankProject(req.user!.id, req.workspace!.id, req.body)

    sendSuccess<{ project: ProjectDetailData }>(res, { project }, 201)
  } catch (error: unknown) {
    next(error)
  }
}

export const createFromMedia: BodyRequestHandler<CreateProjectFromMediaBody> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const project = await projectsService.createProjectFromMedia(req.user!.id, req.workspace!.id, req.body)

    sendSuccess<{ project: ProjectDetailData }>(res, { project }, 201)
  } catch (error: unknown) {
    next(error)
  }
}

export const update: ParamsBodyRequestHandler<ProjectParams, UpdateProjectBody> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const project = await projectsService.updateProject(req.user!.id, req.workspace!.id, req.params.projectId, req.body)

    sendSuccess<{ project: ProjectDetailData }>(res, { project })
  } catch (error: unknown) {
    next(error)
  }
}

export const remove: ParamsRequestHandler<ProjectParams> = async (req, res, next): Promise<void> => {
  try {
    await projectsService.deleteProject(req.user!.id, req.workspace!.id, req.params.projectId)

    sendSuccess<{ message: string }>(res, {
      message: 'Project deleted successfully'
    })
  } catch (error: unknown) {
    next(error)
  }
}

export const setSourceMedia: ParamsBodyRequestHandler<ProjectParams, SetProjectSourceMediaBody> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const project = await projectsService.setSourceMedia(
      req.user!.id,
      req.workspace!.id,
      req.params.projectId,
      req.body
    )

    sendSuccess<{ project: ProjectDetailData }>(res, { project })
  } catch (error: unknown) {
    next(error)
  }
}

export const addMedia: ParamsBodyRequestHandler<ProjectParams, AddProjectMediaBody> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const projectMedia = await projectsService.addProjectMedia(
      req.user!.id,
      req.workspace!.id,
      req.params.projectId,
      req.body
    )

    sendSuccess<{ projectMedia: ProjectMediaData }>(res, { projectMedia }, 201)
  } catch (error: unknown) {
    next(error)
  }
}

export const removeMedia: ParamsRequestHandler<ProjectMediaParams> = async (req, res, next): Promise<void> => {
  try {
    await projectsService.removeProjectMedia(
      req.user!.id,
      req.workspace!.id,
      req.params.projectId,
      req.params.projectMediaId
    )

    sendSuccess<{ message: string }>(res, {
      message: 'Project media removed successfully'
    })
  } catch (error: unknown) {
    next(error)
  }
}
