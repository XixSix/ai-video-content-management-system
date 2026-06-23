"use client"

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react"

import { useAuthSession } from "@/features/auth/hooks/use-auth-session"

import { useWorkspaceList } from "../hooks/use-workspaces"
import type { WorkspaceListItem } from "../workspace.types"

type WorkspaceContextValue = {
  selectedWorkspace: WorkspaceListItem | null
  selectedWorkspaceId: string | null
  workspaces: WorkspaceListItem[]
  isLoading: boolean
  isError: boolean
  error: Error | null
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const authSession = useAuthSession()
  const workspaceQuery = useWorkspaceList(Boolean(authSession.data))
  const value = useMemo<WorkspaceContextValue>(() => {
    const workspaces = workspaceQuery.data?.items ?? []
    const selectedWorkspaceId =
      authSession.data?.workspaceId ??
      workspaceQuery.data?.preferredWorkspaceId ??
      workspaces[0]?.id ??
      null

    return {
      selectedWorkspace:
        workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ??
        null,
      selectedWorkspaceId,
      workspaces,
      isLoading: authSession.isLoading || workspaceQuery.isLoading,
      isError: authSession.isError || workspaceQuery.isError,
      error:
        (workspaceQuery.error instanceof Error
          ? workspaceQuery.error
          : authSession.error instanceof Error
            ? authSession.error
            : null),
    }
  }, [
    authSession.data?.workspaceId,
    authSession.error,
    authSession.isError,
    authSession.isLoading,
    workspaceQuery.data,
    workspaceQuery.error,
    workspaceQuery.isError,
    workspaceQuery.isLoading,
  ])

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)

  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider")
  }

  return context
}
