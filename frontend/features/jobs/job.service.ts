import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { useAuthStore } from "@/features/auth/store/auth.store"
import { API_BASE_URL, unwrapApiResponse } from "@/lib/api/api-client"
import type { ApiSuccess } from "@/lib/api/api.types"

import type {
  JobEventHandler,
  JobSubscription,
  ProcessingJobData,
  ProcessingJobResponse,
} from "./job.types"

type SubscribeToJobEventsInput = {
  jobId: string
  onError: (error: unknown) => void
  onJob: JobEventHandler
}

const jobEventNames = ["job.updated", "job.completed", "job.failed"]

function getJobEventsUrl(jobId: string) {
  return `${API_BASE_URL}/jobs/${jobId}/events`
}

function parseSseEvent(buffer: string): {
  eventName: string
  data: string
} | null {
  const eventName =
    buffer
      .split("\n")
      .find((line) => line.startsWith("event:"))
      ?.slice("event:".length)
      .trim() ?? "message"
  const data = buffer
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trimStart())
    .join("\n")

  return data ? { eventName, data } : null
}

export function isTerminalJob(job: ProcessingJobData) {
  return (
    job.status === "COMPLETED" ||
    job.status === "FAILED" ||
    job.status === "CANCELED"
  )
}

export const jobService = {
  async get(jobId: string): Promise<ProcessingJobResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<ProcessingJobResponse>>(
        `/jobs/${jobId}`
      )
    )
  },

  subscribeToJobEvents({
    jobId,
    onError,
    onJob,
  }: SubscribeToJobEventsInput): JobSubscription {
    const abortController = new AbortController()

    void (async () => {
      const accessToken = useAuthStore.getState().accessToken
      const response = await fetch(getJobEventsUrl(jobId), {
        credentials: "include",
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
        signal: abortController.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error("Job event stream unavailable")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (!abortController.signal.aborted) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })

        while (buffer.includes("\n\n")) {
          const separatorIndex = buffer.indexOf("\n\n")
          const rawEvent = buffer.slice(0, separatorIndex)
          buffer = buffer.slice(separatorIndex + 2)
          const parsedEvent = parseSseEvent(rawEvent)

          if (!parsedEvent || !jobEventNames.includes(parsedEvent.eventName)) {
            continue
          }

          onJob(JSON.parse(parsedEvent.data) as ProcessingJobData)
        }
      }
    })().catch((error: unknown) => {
      if (!abortController.signal.aborted) {
        onError(error)
      }
    })

    return {
      close: () => abortController.abort(),
    }
  },
}
