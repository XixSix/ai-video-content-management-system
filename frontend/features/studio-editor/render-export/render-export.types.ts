import type { RenderExportJob } from "./render-export.schema"

export type RenderExportJobStatus = RenderExportJob["status"]

export type RenderExportTerminalStatus = Extract<
  RenderExportJobStatus,
  "COMPLETED" | "FAILED" | "CANCELED"
>

export type RenderExportJobEventName =
  | "job.updated"
  | "job.completed"
  | "job.failed"

export type RenderExportJobEventHandler = (job: RenderExportJob) => void

export type RenderExportJobSubscription = {
  close: () => void
}
