import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { unwrapApiResponse } from "@/lib/api/api-client"
import type { ApiSuccess } from "@/lib/api/api.types"

import type { BackendPlatform, PlatformAccountData } from "../social-accounts.types"

export const platformAccountsService = {
  list(workspaceId: string): Promise<{ accounts: PlatformAccountData[] }> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<{ accounts: PlatformAccountData[] }>>(
        `/workspaces/${workspaceId}/platform-accounts`
      )
    )
  },

  connect(workspaceId: string, platform: BackendPlatform): Promise<{ authUrl: string }> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<{ authUrl: string }>>(
        `/workspaces/${workspaceId}/platform-accounts/${platform}/connect`
      )
    )
  },

  disconnect(workspaceId: string, platform: BackendPlatform): Promise<{ message: string }> {
    return unwrapApiResponse(
      authenticatedApiClient.delete<ApiSuccess<{ message: string }>>(
        `/workspaces/${workspaceId}/platform-accounts/${platform}`
      )
    )
  },
}
