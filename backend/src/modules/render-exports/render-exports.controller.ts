import type { ParamsRequestHandler } from '../../types/express'
import { sendSuccess } from '../../utils/response'
import type { JobResponseData } from '../jobs/jobs.types'
import type { RenderExportParams } from './render-exports.schema'
import * as renderExportsService from './render-exports.service'

export const create: ParamsRequestHandler<RenderExportParams> = async (req, res, next): Promise<void> => {
  try {
    const result = await renderExportsService.createRenderExport(req.user!.id, req.workspace!.id, req.params.projectId)

    sendSuccess<{ job: JobResponseData }>(res, { job: result.job }, result.wasCreated ? 201 : 200)
  } catch (error: unknown) {
    next(error)
  }
}
