"use client"

import { useState } from "react"
import { Bell, LoaderCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  useAcceptWorkspaceInvitation,
  useDeclineWorkspaceInvitation,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationList,
  useNotificationUnreadCount,
} from "@/features/notifications/hooks/use-notifications"
import {
  countUnreadNotifications,
} from "@/features/notifications/notification-cache"
import {
  canRespondToNotificationInvitation,
  getNotificationBadgeLabel,
  getNotificationIcon,
  getNotificationInvitationStatusLabel,
  getNotificationTimestampLabel,
} from "@/features/notifications/notification.utils"
import type {
  NotificationItem,
  NotificationListParams,
} from "@/features/notifications/notification.types"
import { cn } from "@/lib/utils"

const DEFAULT_NOTIFICATION_PARAMS: NotificationListParams = {
  page: 1,
  limit: 10,
  unreadOnly: false,
}

export function HeaderNotifications() {
  const [open, setOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const listQuery = useNotificationList(DEFAULT_NOTIFICATION_PARAMS, true)
  const unreadCountQuery = useNotificationUnreadCount(true)
  const markReadMutation = useMarkNotificationRead()
  const markAllReadMutation = useMarkAllNotificationsRead()
  const acceptInvitationMutation = useAcceptWorkspaceInvitation()
  const declineInvitationMutation = useDeclineWorkspaceInvitation()
  const notifications = listQuery.data?.items ?? []
  const unreadCount =
    unreadCountQuery.data?.count ?? countUnreadNotifications(notifications)
  const unreadLabel = getNotificationBadgeLabel(unreadCount)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (nextOpen) {
      void listQuery.refetch()
      void unreadCountQuery.refetch()
    }
  }

  const handleMarkRead = async (notification: NotificationItem) => {
    setPendingAction(`read:${notification.id}`)

    try {
      await markReadMutation.mutateAsync(notification.id)
    } catch (error) {
      toast.error("Unable to mark notification as read", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again in a moment.",
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleMarkAllRead = async () => {
    setPendingAction("read-all")

    try {
      await markAllReadMutation.mutateAsync()
    } catch (error) {
      toast.error("Unable to mark all notifications as read", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again in a moment.",
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleInvitationAction = async (
    action: "accept" | "decline",
    notification: NotificationItem
  ) => {
    const invitation = notification.workspaceInvitation

    if (!invitation) {
      return
    }

    setPendingAction(`${action}:${notification.id}`)

    try {
      if (action === "accept") {
        await acceptInvitationMutation.mutateAsync(invitation.id)
        toast.success("Invitation accepted", {
          description: invitation.workspace.name,
        })
      } else {
        await declineInvitationMutation.mutateAsync(invitation.id)
        toast.success("Invitation declined", {
          description: invitation.workspace.name,
        })
      }
    } catch (error) {
      toast.error(
        action === "accept"
          ? "Unable to accept invitation"
          : "Unable to decline invitation",
        {
          description:
            error instanceof Error
              ? error.message
              : "Please try again in a moment.",
        }
      )
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="relative"
              aria-label="Open notifications"
            >
              <Bell className="size-4" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground ring-2 ring-background">
                  {unreadLabel}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>Notifications</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm text-foreground">
            Notifications
          </DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {unreadCount} unread
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-6 px-2"
              disabled={unreadCount === 0 || pendingAction === "read-all"}
              onClick={handleMarkAllRead}
            >
              {pendingAction === "read-all" ? (
                <LoaderCircle className="size-3 animate-spin" />
              ) : null}
              Mark all read
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-96 overflow-y-auto p-1">
          {listQuery.isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading notifications...
            </div>
          ) : null}

          {listQuery.isError && notifications.length === 0 ? (
            <div className="space-y-2 px-3 py-6 text-center">
              <p className="text-sm font-medium text-foreground">
                Notifications could not be loaded
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                {listQuery.error instanceof Error
                  ? listQuery.error.message
                  : "Please try again in a moment."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void listQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : null}

          {!listQuery.isLoading &&
          !listQuery.isError &&
          notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              You are all caught up.
            </div>
          ) : null}

          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification)
            const statusLabel = getNotificationInvitationStatusLabel(
              notification.workspaceInvitation
            )
            const isUnread = notification.readAt === null
            const isMarkReadPending =
              pendingAction === `read:${notification.id}`
            const isAcceptPending =
              pendingAction === `accept:${notification.id}`
            const isDeclinePending =
              pendingAction === `decline:${notification.id}`
            const canRespond = canRespondToNotificationInvitation(notification)

            return (
              <div
                key={notification.id}
                className={cn(
                  "space-y-3 rounded-md px-2.5 py-2.5 text-sm outline-none transition hover:bg-accent",
                  isUnread && "bg-muted/45"
                )}
              >
                <div className="flex gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                    <Icon className="size-4 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-medium leading-5 text-foreground">
                            {notification.title}
                          </p>
                          {isUnread ? (
                            <span className="size-2 shrink-0 rounded-full bg-primary" />
                          ) : null}
                        </div>
                        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {notification.message}
                        </p>
                        {notification.workspaceInvitation ? (
                          <p className="text-[11px] leading-5 text-muted-foreground">
                            Workspace:{" "}
                            {notification.workspaceInvitation.workspace.name}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {getNotificationTimestampLabel(notification.createdAt)}
                      </span>
                    </div>
                    {statusLabel ? (
                      <span className="inline-flex rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                        {statusLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-11">
                  {isUnread ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={isMarkReadPending}
                      onClick={() => void handleMarkRead(notification)}
                    >
                      {isMarkReadPending ? (
                        <LoaderCircle className="size-3 animate-spin" />
                      ) : null}
                      Mark read
                    </Button>
                  ) : null}
                  {canRespond ? (
                    <>
                      <Button
                        type="button"
                        size="xs"
                        disabled={isAcceptPending || isDeclinePending}
                        onClick={() =>
                          void handleInvitationAction("accept", notification)
                        }
                      >
                        {isAcceptPending ? (
                          <LoaderCircle className="size-3 animate-spin" />
                        ) : null}
                        Accept
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={isAcceptPending || isDeclinePending}
                        onClick={() =>
                          void handleInvitationAction("decline", notification)
                        }
                      >
                        {isDeclinePending ? (
                          <LoaderCircle className="size-3 animate-spin" />
                        ) : null}
                        Decline
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
