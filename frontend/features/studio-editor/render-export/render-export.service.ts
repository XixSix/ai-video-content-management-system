import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { useAuthStore } from "@/features/auth/store/auth.store"
import { API_BASE_URL, unwrapApiResponse } from "@/lib/api/api-client"
import type { ApiSuccess } from "@/lib/api/api.types"

import {
  assetDownloadUrlResponseSchema,
  renderExportJobResponseSchema,
  renderExportJobSchema,
  type AssetDownloadUrlResponse,
  type RenderExportJob,
  type RenderExportJobResponse,
} from "./render-export.schema"
import type {
  RenderExportJobEventHandler,
  RenderExportJobEventName,
  RenderExportJobSubscription,
} from "./render-export.types"

type SubscribeToRenderExportJobEventsInput = {
  jobId: string
  onError: (error: unknown) => void
  onJob: RenderExportJobEventHandler
}

const renderExportJobEventNames: RenderExportJobEventName[] = [
  "job.updated",
  "job.completed",
  "job.failed",
]

function parseRenderExportJobResponse(data: RenderExportJobResponse) {
  return renderExportJobResponseSchema.parse(data)
}

function parseAssetDownloadUrlResponse(data: AssetDownloadUrlResponse) {
  return assetDownloadUrlResponseSchema.parse(data)
}

export function isTerminalRenderExportJob(job: RenderExportJob) {
  return (
    job.status === "COMPLETED" ||
    job.status === "FAILED" ||
    job.status === "CANCELED"
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function getRenderExportAssetId(job: RenderExportJob): string | null {
  if (job.status !== "COMPLETED" || !isRecord(job.output)) {
    return null
  }

  const summary = job.output.summary

  if (isRecord(summary) && typeof summary.assetId === "string") {
    return summary.assetId
  }

  const asset = job.output.asset

  if (isRecord(asset) && typeof asset.id === "string") {
    return asset.id
  }

  return null
}

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

export const renderExportService = {
  async create(
    workspaceId: string,
    projectId: string
  ): Promise<RenderExportJobResponse> {
    const data = await unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<RenderExportJobResponse>>(
        `/workspaces/${workspaceId}/projects/${projectId}/export-render`
      )
    )

    return parseRenderExportJobResponse(data)
  },

  async getJob(jobId: string): Promise<RenderExportJobResponse> {
    const data = await unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<RenderExportJobResponse>>(
        `/jobs/${jobId}`
      )
    )

    return parseRenderExportJobResponse(data)
  },

  async getAssetDownloadUrl(
    assetId: string
  ): Promise<AssetDownloadUrlResponse> {
    const data = await unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<AssetDownloadUrlResponse>>(
        `/assets/${assetId}/download-url`
      )
    )

    return parseAssetDownloadUrlResponse(data)
  },

  subscribeToJobEvents({
    jobId,
    onError,
    onJob,
  }: SubscribeToRenderExportJobEventsInput): RenderExportJobSubscription {
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
        throw new Error("Render export event stream unavailable")
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

          if (
            !parsedEvent ||
            !renderExportJobEventNames.includes(
              parsedEvent.eventName as RenderExportJobEventName
            )
          ) {
            continue
          }

          onJob(renderExportJobSchema.parse(JSON.parse(parsedEvent.data)))
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
