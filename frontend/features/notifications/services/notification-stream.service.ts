import { refreshAccessToken } from "@/features/auth/services/auth-refresh.service"
import { API_BASE_URL } from "@/lib/api/api-client"

import type {
  NotificationEvent,
  NotificationEventName,
  NotificationStreamState,
} from "../notification.types"

export class NotificationStreamError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "NotificationStreamError"
    this.status = status
  }
}

export async function openNotificationEventStream({
  accessToken,
  signal,
  onEvent,
  onOpen,
}: {
  accessToken: string
  signal: AbortSignal
  onEvent(event: NotificationEvent): void
  onOpen?(): void
}): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/notifications/events`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "text/event-stream",
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  })

  if (!response.ok) {
    throw new NotificationStreamError(
      response.statusText || "Unable to connect to notifications",
      response.status
    )
  }

  if (!response.body) {
    throw new NotificationStreamError(
      "Notification stream did not include a response body",
      response.status
    )
  }

  onOpen?.()

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n")
    const chunks = buffer.split("\n\n")
    buffer = chunks.pop() ?? ""

    for (const chunk of chunks) {
      const event = parseNotificationSseChunk(chunk)

      if (event) {
        onEvent(event)
      }
    }
  }

  buffer += decoder.decode()
  const tailEvent = parseNotificationSseChunk(buffer)

  if (tailEvent) {
    onEvent(tailEvent)
  }
}

export function parseNotificationSseChunk(
  chunk: string
): NotificationEvent | null {
  const normalizedChunk = chunk.trim()

  if (!normalizedChunk) {
    return null
  }

  let eventName: NotificationEventName | null = null
  const dataLines: string[] = []

  for (const line of normalizedChunk.split("\n")) {
    if (!line || line.startsWith(":")) {
      continue
    }

    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim() as NotificationEventName
      continue
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim())
    }
  }

  if (!eventName || dataLines.length === 0) {
    return null
  }

  return {
    event: eventName,
    data: JSON.parse(dataLines.join("\n")) as NotificationEvent["data"],
  } as NotificationEvent
}

export async function runNotificationEventStream({
  getAccessToken,
  onEvent,
  onStateChange,
  signal,
  connect = openNotificationEventStream,
  refreshToken = refreshAccessToken,
  sleep = waitForReconnect,
}: {
  getAccessToken(): string | null
  onEvent(event: NotificationEvent): void
  onStateChange(state: NotificationStreamState): void
  signal: AbortSignal
  connect?: typeof openNotificationEventStream
  refreshToken?: typeof refreshAccessToken
  sleep?: (durationMs: number, signal: AbortSignal) => Promise<void>
}): Promise<void> {
  let reconnectDelayMs = 1_000

  while (!signal.aborted) {
    const accessToken = getAccessToken()

    if (!accessToken) {
      onStateChange({
        status: "idle",
        error: null,
        lastEventAt: null,
      })
      return
    }

    onStateChange({
      status: "connecting",
      error: null,
      lastEventAt: null,
    })

    try {
      await connect({
        accessToken,
        signal,
        onOpen: () => {
          reconnectDelayMs = 1_000
          onStateChange({
            status: "connected",
            error: null,
            lastEventAt: new Date().toISOString(),
          })
        },
        onEvent: (event) => {
          onStateChange({
            status: "connected",
            error: null,
            lastEventAt: new Date().toISOString(),
          })
          onEvent(event)
        },
      })
    } catch (error) {
      if (signal.aborted) {
        return
      }

      if (
        error instanceof NotificationStreamError &&
        error.status === 401
      ) {
        try {
          await refreshToken()
          reconnectDelayMs = 1_000
          continue
        } catch (refreshError) {
          onStateChange({
            status: "disconnected",
            error:
              refreshError instanceof Error
                ? refreshError.message
                : "Notification stream authorization failed",
            lastEventAt: null,
          })
          return
        }
      }

      onStateChange({
        status: "disconnected",
        error:
          error instanceof Error
            ? error.message
            : "Notification stream disconnected",
        lastEventAt: null,
      })
    }

    if (signal.aborted) {
      return
    }

    try {
      await sleep(reconnectDelayMs, signal)
    } catch (error) {
      if (signal.aborted) {
        return
      }

      throw error
    }

    reconnectDelayMs = Math.min(reconnectDelayMs * 2, 30_000)
  }
}

async function waitForReconnect(
  durationMs: number,
  signal: AbortSignal
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      signal.removeEventListener("abort", abort)
      resolve()
    }, durationMs)

    const abort = () => {
      globalThis.clearTimeout(timeout)
      reject(new DOMException("Aborted", "AbortError"))
    }

    signal.addEventListener("abort", abort, { once: true })
  })
}
