"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { platformAccountsService } from "../services/platform-accounts.service"
import { platformAccountsQueryKeys } from "./platform-accounts-query-keys"
import type { BackendPlatform } from "../social-accounts.types"

export function usePlatformAccounts(workspaceId: string, enabled = true) {
  return useQuery({
    queryKey: platformAccountsQueryKeys.list(workspaceId),
    queryFn: () => platformAccountsService.list(workspaceId),
    enabled: Boolean(workspaceId) && enabled,
  })
}

export function useConnectPlatform(workspaceId: string) {
  return useMutation({
    mutationFn: (platform: BackendPlatform) => {
      localStorage.setItem("oauth_return_to", window.location.pathname)
      return platformAccountsService.connect(workspaceId, platform)
    },
    onSuccess: (data) => {
      window.location.href = data.authUrl
    },
  })
}

export function useDisconnectPlatform(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (platform: BackendPlatform) =>
      platformAccountsService.disconnect(workspaceId, platform),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: platformAccountsQueryKeys.list(workspaceId),
      })
    },
  })
}
