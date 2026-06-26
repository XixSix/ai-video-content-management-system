import type { ParamsRequestHandler } from '../../types/express'
import type { QueryRequestHandler } from '../../types/express'
import { sendSuccess } from '../../utils/response'
import { streamJobEvents } from './jobs.events'
import type { JobParams, ListJobsQuery } from './jobs.schema'
import * as jobsService from './jobs.service'
import type { JobResponseData, PaginatedResult } from './jobs.types'

export const list: QueryRequestHandler<ListJobsQuery> = async (req, res, next): Promise<void> => {
  try {
    const query = req.query as ListJobsQuery
    const result = await jobsService.listJobs(req.user!.id, query)

    sendSuccess<{ items: JobResponseData[]; meta: Omit<PaginatedResult<never>, 'items'> }>(res, {
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

export const get: ParamsRequestHandler<JobParams> = async (req, res, next): Promise<void> => {
  try {
    const job = await jobsService.getJob(req.user!.id, req.params.jobId)

    sendSuccess<{ job: JobResponseData }>(res, { job })
  } catch (error: unknown) {
    next(error)
  }
}

export const events: ParamsRequestHandler<JobParams> = async (req, res, next): Promise<void> => {
  await streamJobEvents({
    jobId: req.params.jobId,
    onError: next,
    res,
    userId: req.user!.id
  })
}
