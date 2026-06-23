"use client"

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect } from "react"

import { refreshAccessToken } from "@/features/auth/services/auth-refresh.service"
import { useAuthStore } from "@/features/auth/store/auth.store"
import { workspaceQueryKeys } from "@/features/workspaces/hooks/workspace-query-keys"

import {
  applyInvitationActionToList,
  findNotificationInLists,
  markAllNotificationsReadInList,
  markNotificationReadInList,
  mergeNotificationIntoList,
} from "../notification-cache"
import type {
  NotificationEvent,
  NotificationInvitationAction,
  NotificationItem,
  NotificationListResponse,
  NotificationStreamState,
  NotificationUnreadCountResponse,
  NotificationListParams,
} from "../notification.types"
import { notificationService } from "../services/notification.service"
import { runNotificationEventStream } from "../services/notification-stream.service"
import { notificationQueryKeys } from "./notification-query-keys"

const DEFAULT_STREAM_STATE: NotificationStreamState = {
  status: "idle",
  error: null,
  lastEventAt: null,
}

type NotificationMutationContext = {
  lists: Array<[readonly unknown[], NotificationListResponse | undefined]>
  unreadCount: NotificationUnreadCountResponse | undefined
}

export function useNotificationList(
  params: NotificationListParams,
  enabled = true
) {
  return useQuery({
    queryKey: notificationQueryKeys.list(params),
    queryFn: () => notificationService.list(params),
    enabled,
    staleTime: 30_000,
  })
}

export function useNotificationUnreadCount(enabled = true) {
  return useQuery({
    queryKey: notificationQueryKeys.unreadCount(),
    queryFn: notificationService.getUnreadCount,
    enabled,
    staleTime: 30_000,
  })
}

export function useNotificationStream() {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const status = useAuthStore((state) => state.status)
  const setAccessToken = useAuthStore((state) => state.setAccessToken)

  useEffect(() => {
    if (status === "anonymous") {
      queryClient.removeQueries({ queryKey: notificationQueryKeys.all })
      queryClient.setQueryData(
        notificationQueryKeys.streamState(),
        DEFAULT_STREAM_STATE
      )
      return
    }

    if (status !== "authenticated" || !accessToken) {
      queryClient.setQueryData(
        notificationQueryKeys.streamState(),
        DEFAULT_STREAM_STATE
      )
      return
    }

    const abortController = new AbortController()

    void runNotificationEventStream({
      getAccessToken: () => useAuthStore.getState().accessToken,
      onEvent: (event) => applyNotificationEvent(queryClient, event),
      onStateChange: (nextState) => {
        queryClient.setQueryData(notificationQueryKeys.streamState(), nextState)
      },
      signal: abortController.signal,
      refreshToken: async () => {
        const nextAccessToken = await refreshAccessToken()
        setAccessToken(nextAccessToken)
        return nextAccessToken
      },
    })

    return () => {
      abortController.abort()
    }
  }, [accessToken, queryClient, setAccessToken, status])
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.markRead(notificationId),
    onMutate: async (notificationId): Promise<NotificationMutationContext> => {
      await queryClient.cancelQueries({ queryKey: notificationQueryKeys.all })

      const context = snapshotNotificationMutationContext(queryClient)
      const readAt = new Date().toISOString()
      const lists = context.lists
        .map(([, list]) => list)
        .filter((list): list is NotificationListResponse => Boolean(list))
      const previous = findNotificationInLists(lists, notificationId)

      updateAllNotificationLists(queryClient, (current) =>
        markNotificationReadInList(current, notificationId, readAt)
      )

      if (previous?.readAt === null) {
        setUnreadCount(queryClient, Math.max((context.unreadCount?.count ?? 0) - 1, 0))
      }

      return context
    },
    onError: (_error, _notificationId, context) => {
      restoreNotificationMutationContext(queryClient, context)
    },
    onSuccess: ({ notification }) => {
      upsertNotification(queryClient, notification, "notification.updated")
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onMutate: async (): Promise<NotificationMutationContext> => {
      await queryClient.cancelQueries({ queryKey: notificationQueryKeys.all })

      const context = snapshotNotificationMutationContext(queryClient)
      const readAt = new Date().toISOString()

      updateAllNotificationLists(queryClient, (current) =>
        markAllNotificationsReadInList(current, readAt)
      )
      setUnreadCount(queryClient, 0)

      return context
    },
    onError: (_error, _variables, context) => {
      restoreNotificationMutationContext(queryClient, context)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.unreadCount(),
      })
    },
  })
}

export function useAcceptWorkspaceInvitation() {
  return useWorkspaceInvitationAction("accept")
}

export function useDeclineWorkspaceInvitation() {
  return useWorkspaceInvitationAction("decline")
}

function useWorkspaceInvitationAction(action: "accept" | "decline") {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: string) =>
      action === "accept"
        ? notificationService.acceptInvitation(invitationId)
        : notificationService.declineInvitation(invitationId),
    onMutate: async (invitationId): Promise<NotificationMutationContext> => {
      await queryClient.cancelQueries({ queryKey: notificationQueryKeys.all })

      const context = snapshotNotificationMutationContext(queryClient)
      const readAt = new Date().toISOString()
      const status = action === "accept" ? "ACCEPTED" : "DECLINED"

      updateAllNotificationLists(queryClient, (current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          items: current.items.map((notification) =>
            notification.workspaceInvitation?.id === invitationId
              ? {
                  ...notification,
                  readAt,
                  workspaceInvitation: {
                    ...notification.workspaceInvitation,
                    status,
                  },
                }
              : notification
          ),
        }
      })

      const invitationNotification = context.lists
        .map(([, list]) => list)
        .filter((list): list is NotificationListResponse => Boolean(list))
        .flatMap((list) => list.items)
        .find((notification) => notification.workspaceInvitation?.id === invitationId)

      if (invitationNotification?.readAt === null) {
        setUnreadCount(queryClient, Math.max((context.unreadCount?.count ?? 0) - 1, 0))
      }

      return context
    },
    onError: (_error, _variables, context) => {
      restoreNotificationMutationContext(queryClient, context)
    },
    onSuccess: ({ invitation }) => {
      applyInvitationAction(queryClient, invitation)

      if (action === "accept") {
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.list(),
        })
      }
    },
  })
}

function snapshotNotificationMutationContext(
  queryClient: QueryClient
): NotificationMutationContext {
  return {
    lists: queryClient.getQueriesData<NotificationListResponse>({
      queryKey: notificationQueryKeys.lists(),
    }),
    unreadCount: queryClient.getQueryData<NotificationUnreadCountResponse>(
      notificationQueryKeys.unreadCount()
    ),
  }
}

function restoreNotificationMutationContext(
  queryClient: QueryClient,
  context: NotificationMutationContext | undefined
) {
  if (!context) {
    return
  }

  for (const [queryKey, data] of context.lists) {
    queryClient.setQueryData(queryKey, data)
  }

  queryClient.setQueryData(
    notificationQueryKeys.unreadCount(),
    context.unreadCount
  )
}

function updateAllNotificationLists(
  queryClient: QueryClient,
  updater: (
    current: NotificationListResponse | undefined
  ) => NotificationListResponse | undefined
) {
  const queries = queryClient.getQueriesData<NotificationListResponse>({
    queryKey: notificationQueryKeys.lists(),
  })

  for (const [queryKey, list] of queries) {
    queryClient.setQueryData(queryKey, updater(list))
  }
}

function setUnreadCount(
  queryClient: QueryClient,
  count: number
) {
  queryClient.setQueryData<NotificationUnreadCountResponse>(
    notificationQueryKeys.unreadCount(),
    { count }
  )
}

function upsertNotification(
  queryClient: QueryClient,
  notification: NotificationItem,
  eventName: "notification.created" | "notification.updated"
) {
  const lists = queryClient
    .getQueriesData<NotificationListResponse>({
      queryKey: notificationQueryKeys.lists(),
    })
    .map(([, list]) => list)
    .filter((list): list is NotificationListResponse => Boolean(list))
  const previous = findNotificationInLists(lists, notification.id)

  updateAllNotificationLists(queryClient, (current) =>
    mergeNotificationIntoList(current, notification, {
      prependIfMissing: eventName === "notification.created",
    })
  )

  const unreadCount = queryClient.getQueryData<NotificationUnreadCountResponse>(
    notificationQueryKeys.unreadCount()
  )

  if (!unreadCount) {
    return
  }

  const previousUnread = previous?.readAt === null
  const nextUnread = notification.readAt === null

  if (previous) {
    const delta = Number(nextUnread) - Number(previousUnread)
    setUnreadCount(queryClient, Math.max(unreadCount.count + delta, 0))
    return
  }

  if (eventName === "notification.created" && nextUnread) {
    setUnreadCount(queryClient, unreadCount.count + 1)
    return
  }

  void queryClient.invalidateQueries({
    queryKey: notificationQueryKeys.unreadCount(),
  })
}

function applyInvitationAction(
  queryClient: QueryClient,
  invitation: NotificationInvitationAction
) {
  const readAt = new Date().toISOString()

  updateAllNotificationLists(queryClient, (current) =>
    applyInvitationActionToList(current, invitation, readAt)
  )

  void queryClient.invalidateQueries({
    queryKey: notificationQueryKeys.unreadCount(),
  })
}

function applyNotificationEvent(
  queryClient: QueryClient,
  event: NotificationEvent
) {
  if (event.event === "notification.ready") {
    setUnreadCount(queryClient, event.data.unreadCount)
    return
  }

  if (event.event === "notification.heartbeat") {
    return
  }

  upsertNotification(queryClient, event.data, event.event)
}
