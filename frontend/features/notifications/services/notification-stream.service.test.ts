import { afterEach, describe, expect, it, vi } from "vitest"

import type {
  NotificationCreatedEvent,
  NotificationHeartbeatEvent,
  NotificationReadyEvent,
  NotificationUpdatedEvent,
} from "../notification.types"
import {
  NotificationStreamError,
  openNotificationEventStream,
  parseNotificationSseChunk,
  runNotificationEventStream,
} from "./notification-stream.service"

const originalFetch = globalThis.fetch

function createReadableStream(chunks: string[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk))
      }

      controller.close()
    },
  })
}

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe("notification stream service", () => {
  it("parses notification SSE events and sends bearer auth", async () => {
    const events: Array<
      | NotificationReadyEvent
      | NotificationCreatedEvent
      | NotificationUpdatedEvent
      | NotificationHeartbeatEvent
    > = []
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        createReadableStream([
          'event: notification.ready\ndata: {"unreadCount":2}\n\n',
          'event: notification.created\ndata: {"id":"1","type":"WORKSPACE_INVITATION","title":"Invite","message":"Join the team","data":null,"readAt":null,"createdAt":"2026-06-23T00:00:00.000Z","actor":null,"workspaceInvitation":{"id":"inv-1","status":"PENDING","expiresAt":"2026-06-30T00:00:00.000Z","workspace":{"id":"workspace-1","name":"Creator Team","slug":"creator-team"}}}\n\n',
          'event: notification.updated\ndata: {"id":"1","type":"WORKSPACE_INVITATION","title":"Invite","message":"Join the team","data":null,"readAt":"2026-06-23T00:01:00.000Z","createdAt":"2026-06-23T00:00:00.000Z","actor":null,"workspaceInvitation":{"id":"inv-1","status":"ACCEPTED","expiresAt":"2026-06-30T00:00:00.000Z","workspace":{"id":"workspace-1","name":"Creator Team","slug":"creator-team"}}}\n\n',
          'event: notification.heartbeat\ndata: {"timestamp":"2026-06-23T00:01:00.000Z"}\n\n',
        ]),
        {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
          },
        }
      )
    )
    globalThis.fetch = fetchMock as typeof fetch

    await openNotificationEventStream({
      accessToken: "token-123",
      signal: new AbortController().signal,
      onEvent: (event) => {
        events.push(event as (typeof events)[number])
      },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/notifications\/events$/),
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({
          Accept: "text/event-stream",
          Authorization: "Bearer token-123",
        }),
      })
    )
    expect(events.map((event) => event.event)).toEqual([
      "notification.ready",
      "notification.created",
      "notification.updated",
      "notification.heartbeat",
    ])
  })

  it("parses one SSE chunk at a time", () => {
    expect(
      parseNotificationSseChunk(
        'event: notification.ready\ndata: {"unreadCount":3}\n'
      )
    ).toEqual({
      event: "notification.ready",
      data: { unreadCount: 3 },
    })
    expect(parseNotificationSseChunk("")).toBeNull()
  })

  it("refreshes and reconnects once when the stream returns 401", async () => {
    const abortController = new AbortController()
    const connect = vi
      .fn()
      .mockRejectedValueOnce(
        new NotificationStreamError("Unauthorized", 401)
      )
      .mockImplementationOnce(
        async ({
          onOpen,
          onEvent,
        }: Parameters<typeof openNotificationEventStream>[0]) => {
          onOpen?.()
          onEvent({
            event: "notification.ready",
            data: { unreadCount: 1 },
          })
          abortController.abort()
        }
      )
    const refreshToken = vi.fn().mockResolvedValue("refreshed-token")
    const getAccessToken = vi
      .fn()
      .mockReturnValueOnce("stale-token")
      .mockReturnValue("refreshed-token")
    const onStateChange = vi.fn()
    const onEvent = vi.fn()
    await runNotificationEventStream({
      connect,
      getAccessToken,
      onEvent,
      onStateChange,
      refreshToken,
      signal: abortController.signal,
      sleep: vi.fn().mockResolvedValue(undefined),
    })

    expect(refreshToken).toHaveBeenCalledTimes(1)
    expect(connect).toHaveBeenCalledTimes(2)
    expect(onEvent).toHaveBeenCalledWith({
      event: "notification.ready",
      data: { unreadCount: 1 },
    })
  })
})
