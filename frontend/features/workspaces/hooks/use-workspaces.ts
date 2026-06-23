"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { updateAuthSessionWorkspace } from "@/features/auth/hooks/auth-session-cache"

import { workspaceService } from "../services/workspace.service"
import type { WorkspaceListData } from "../workspace.types"
import { workspaceQueryKeys } from "./workspace-query-keys"

export function useWorkspaceList(enabled = true) {
  return useQuery({
    queryKey: workspaceQueryKeys.list(),
    queryFn: workspaceService.list,
    enabled,
    staleTime: 60_000,
  })
}

export function useWorkspaceDetail(workspaceId: string, enabled = true) {
  return useQuery({
    queryKey: workspaceQueryKeys.detail(workspaceId),
    queryFn: () => workspaceService.get(workspaceId),
    enabled: Boolean(workspaceId) && enabled,
  })
}

export function useWorkspaceMembers(workspaceId: string, enabled = true) {
  return useQuery({
    queryKey: workspaceQueryKeys.members(workspaceId),
    queryFn: () => workspaceService.listMembers(workspaceId),
    enabled: Boolean(workspaceId) && enabled,
  })
}

export function useSetPreferredWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (workspaceId: string) =>
      workspaceService.setPreferred(workspaceId),
    onSuccess: ({ preferredWorkspaceId }) => {
      updateAuthSessionWorkspace(queryClient, preferredWorkspaceId)
      queryClient.setQueryData<WorkspaceListData>(
        workspaceQueryKeys.list(),
        (current) =>
          current
            ? { ...current, preferredWorkspaceId }
            : current
      )
    },
  })
}

export function useInviteWorkspaceMember(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (email: string) => workspaceService.invite(workspaceId, email),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.members(workspaceId),
      }),
  })
}
