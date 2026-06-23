import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { unwrapApiResponse } from "@/lib/api/api-client"
import type { ApiSuccess } from "@/lib/api/api.types"

import type {
  WorkspaceDetail,
  WorkspaceInvitation,
  WorkspaceListData,
  WorkspaceMember,
} from "../workspace.types"

export const workspaceService = {
  list(): Promise<WorkspaceListData> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<WorkspaceListData>>("/workspaces")
    )
  },

  get(workspaceId: string): Promise<{ workspace: WorkspaceDetail }> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<{ workspace: WorkspaceDetail }>>(
        `/workspaces/${workspaceId}`
      )
    )
  },

  listMembers(workspaceId: string): Promise<{ members: WorkspaceMember[] }> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<{ members: WorkspaceMember[] }>>(
        `/workspaces/${workspaceId}/members`
      )
    )
  },

  setPreferred(
    workspaceId: string
  ): Promise<{ preferredWorkspaceId: string }> {
    return unwrapApiResponse(
      authenticatedApiClient.put<
        ApiSuccess<{ preferredWorkspaceId: string }>
      >(`/workspaces/${workspaceId}/preferred`)
    )
  },

  invite(
    workspaceId: string,
    email: string
  ): Promise<{ invitation: WorkspaceInvitation }> {
    return unwrapApiResponse(
      authenticatedApiClient.post<
        ApiSuccess<{ invitation: WorkspaceInvitation }>
      >(`/workspaces/${workspaceId}/invitations`, { email })
    )
  },
}
