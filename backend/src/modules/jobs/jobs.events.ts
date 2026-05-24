import type { Response } from 'express'
import * as jobsService from './jobs.service'
import type { JobEventData, JobEventName, JobResponseData } from './jobs.types'

export interface JobEventStreamInput {
  jobId: string
  onError(error: unknown): void
  res: Response
  userId: string
}

export const streamJobEvents = async ({ jobId, onError, res, userId }: JobEventStreamInput): Promise<void> => {
  let pollInterval: NodeJS.Timeout | undefined
  let heartbeatInterval: NodeJS.Timeout | undefined
  let isClosed = false

  const cleanup = (): void => {
    isClosed = true

    if (pollInterval) {
      clearInterval(pollInterval)
    }

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
    }
  }

  try {
    let lastJob = await jobsService.getJob(userId, jobId)

    prepareEventStream(res)
    res.on('close', cleanup)

    emitJobEvent(res, jobsService.getJobEventName(lastJob), lastJob)

    if (jobsService.isTerminalJob(lastJob)) {
      cleanup()
      res.end()
      return
    }

    pollInterval = setInterval(() => {
      void (async (): Promise<void> => {
        if (isClosed) {
          return
        }

        const nextJob = await jobsService.getJob(userId, jobId)

        if (!jobsService.hasJobChanged(lastJob, nextJob)) {
          return
        }

        lastJob = nextJob
        emitJobEvent(res, jobsService.getJobEventName(nextJob), nextJob)

        if (jobsService.isTerminalJob(nextJob)) {
          cleanup()
          res.end()
        }
      })().catch((error: unknown) => {
        cleanup()

        if (!res.headersSent) {
          onError(error)
          return
        }

        res.end()
      })
    }, jobsService.JOB_EVENT_POLL_INTERVAL_MS)

    heartbeatInterval = setInterval(() => {
      if (!isClosed) {
        emitEvent(res, 'job.heartbeat', { jobId })
      }
    }, jobsService.JOB_EVENT_HEARTBEAT_INTERVAL_MS)
  } catch (error: unknown) {
    cleanup()
    onError(error)
  }
}

const prepareEventStream = (res: Response): void => {
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
}

const emitJobEvent = (res: Response, event: JobEventName, job: JobResponseData): void => {
  emitEvent(res, event, jobsService.toJobEventData(job))
}

const emitEvent = (res: Response, event: JobEventName, data: JobEventData | { jobId: string }): void => {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}
