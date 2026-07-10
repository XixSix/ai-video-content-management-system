import { JobType } from '../../infrastructure/db/generated/prisma/client'
import type { JobResponseData } from '../jobs/jobs.types'
import type { WorkerJobMessage } from '../jobs/jobs.queue-message'

export const RENDER_EXPORTS_QUEUE_NAME = 'render_exports_queue'
export const RENDER_EXPORTS_CELERY_TASK_NAME = 'render_export_task'
export const EXPORT_RENDER_TASK_NAME = 'export_render'

export type RenderExportJobMessage = WorkerJobMessage<typeof JobType.EXPORT_RENDER, typeof EXPORT_RENDER_TASK_NAME>

export interface CreateRenderExportResult {
  job: JobResponseData
  wasCreated: boolean
}
