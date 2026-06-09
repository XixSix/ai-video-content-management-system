import type {
  BodyRequestHandler,
  ParamsBodyRequestHandler,
  ParamsRequestHandler,
  QueryRequestHandler
} from '../../types/express'
import { sendSuccess } from '../../utils/response'
import type {
  CreatePublishTaskBody,
  ListPublishTasksQuery,
  PublishTaskParams,
  SchedulePublishTaskBody,
  UpdatePublishTaskBody
} from './publish-tasks.schema'
import * as publishTasksService from './publish-tasks.service'
import type { PaginatedResult, PublishTaskData, PublishTaskJobResult } from './publish-tasks.types'

export const create: BodyRequestHandler<CreatePublishTaskBody> = async (req, res, next): Promise<void> => {
  try {
    const publishTask = await publishTasksService.createPublishTask(req.user!.id, req.body)

    sendSuccess<{ publishTask: PublishTaskData }>(res, { publishTask }, 201)
  } catch (error: unknown) {
    next(error)
  }
}

export const list: QueryRequestHandler<ListPublishTasksQuery> = async (req, res, next): Promise<void> => {
  try {
    const query = req.query as ListPublishTasksQuery
    const result = await publishTasksService.listPublishTasks(req.user!.id, query)

    sendSuccess<{ items: PublishTaskData[]; meta: Omit<PaginatedResult<never>, 'items'> }>(res, {
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

export const get: ParamsRequestHandler<PublishTaskParams> = async (req, res, next): Promise<void> => {
  try {
    const publishTask = await publishTasksService.getPublishTask(req.user!.id, req.params.publishTaskId)

    sendSuccess<{ publishTask: PublishTaskData }>(res, { publishTask })
  } catch (error: unknown) {
    next(error)
  }
}

export const update: ParamsBodyRequestHandler<PublishTaskParams, UpdatePublishTaskBody> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const publishTask = await publishTasksService.updatePublishTask(req.user!.id, req.params.publishTaskId, req.body)

    sendSuccess<{ publishTask: PublishTaskData }>(res, { publishTask })
  } catch (error: unknown) {
    next(error)
  }
}

export const publish: ParamsRequestHandler<PublishTaskParams> = async (req, res, next): Promise<void> => {
  try {
    const result = await publishTasksService.publishPublishTask(req.user!.id, req.params.publishTaskId)

    sendSuccess<PublishTaskJobResult>(res, result, 201)
  } catch (error: unknown) {
    next(error)
  }
}

export const schedule: ParamsBodyRequestHandler<PublishTaskParams, SchedulePublishTaskBody> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const result = await publishTasksService.schedulePublishTask(req.user!.id, req.params.publishTaskId, req.body)

    sendSuccess<PublishTaskJobResult>(res, result, 201)
  } catch (error: unknown) {
    next(error)
  }
}

export const cancel: ParamsRequestHandler<PublishTaskParams> = async (req, res, next): Promise<void> => {
  try {
    const publishTask = await publishTasksService.cancelPublishTask(req.user!.id, req.params.publishTaskId)

    sendSuccess<{ publishTask: PublishTaskData }>(res, { publishTask })
  } catch (error: unknown) {
    next(error)
  }
}
