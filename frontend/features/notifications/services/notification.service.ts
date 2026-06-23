import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { unwrapApiResponse } from "@/lib/api/api-client"
import type { ApiSuccess } from "@/lib/api/api.types"

import type {
  NotificationInvitationActionResponse,
  NotificationListParams,
  NotificationListResponse,
  NotificationMarkAllReadResponse,
  NotificationMarkReadResponse,
  NotificationUnreadCountResponse,
} from "../notification.types"

export const notificationService = {
  list(params: NotificationListParams): Promise<NotificationListResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<NotificationListResponse>>(
        "/notifications",
        {
          params,
        }
      )
    )
  },

  getUnreadCount(): Promise<NotificationUnreadCountResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<NotificationUnreadCountResponse>>(
        "/notifications/unread-count"
      )
    )
  },

  markRead(notificationId: string): Promise<NotificationMarkReadResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.patch<ApiSuccess<NotificationMarkReadResponse>>(
        `/notifications/${notificationId}/read`
      )
    )
  },

  markAllRead(): Promise<NotificationMarkAllReadResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.patch<ApiSuccess<NotificationMarkAllReadResponse>>(
        "/notifications/read-all"
      )
    )
  },

  acceptInvitation(
    invitationId: string
  ): Promise<NotificationInvitationActionResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.post<
        ApiSuccess<NotificationInvitationActionResponse>
      >(`/workspace-invitations/${invitationId}/accept`)
    )
  },

  declineInvitation(
    invitationId: string
  ): Promise<NotificationInvitationActionResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.post<
        ApiSuccess<NotificationInvitationActionResponse>
      >(`/workspace-invitations/${invitationId}/decline`)
    )
  },
}
