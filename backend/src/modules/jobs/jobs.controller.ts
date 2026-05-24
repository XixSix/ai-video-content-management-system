import type { ParamsRequestHandler } from '../../types/express'
import { sendSuccess } from '../../utils/response'
import { streamJobEvents } from './jobs.events'
import type { JobParams } from './jobs.schema'
import * as jobsService from './jobs.service'
import type { JobResponseData } from './jobs.types'

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
