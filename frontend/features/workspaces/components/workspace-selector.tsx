"use client"

import { Check, ChevronsUpDown, LoaderCircle, Sparkles, Users } from "lucide-react"
import { toast } from "sonner"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/components/ui/sidebar"

import { useSetPreferredWorkspace } from "../hooks/use-workspaces"
import { useWorkspace } from "./workspace-provider"

export function WorkspaceSelector({
  onManageMembers,
}: {
  onManageMembers: () => void
}) {
  const {
    error,
    isError,
    isLoading,
    selectedWorkspace,
    selectedWorkspaceId,
    workspaces,
  } = useWorkspace()
  const preferredMutation = useSetPreferredWorkspace()

  const selectWorkspace = (workspaceId: string) => {
    if (workspaceId === selectedWorkspaceId) return

    preferredMutation.mutate(workspaceId, {
      onError: (mutationError) =>
        toast.error("Unable to switch workspace", {
          description:
            mutationError instanceof Error
              ? mutationError.message
              : "Please try again.",
        }),
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          className="h-10 rounded-lg border border-sidebar-border bg-surface-raised px-2.5 shadow-[0_1px_1px_rgba(0,0,0,0.04)] group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          tooltip={selectedWorkspace?.name ?? "Workspace"}
          disabled={isLoading}
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent">
            {isLoading ? (
              <LoaderCircle className="size-3.5 animate-spin text-primary" />
            ) : (
              <Sparkles className="size-3.5 text-primary" />
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-left group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-[14px] font-semibold">
              {isError
                ? "Workspace unavailable"
                : selectedWorkspace?.name ?? "No workspace"}
            </span>
            {selectedWorkspace ? (
              <span className="block text-[10px] font-medium uppercase tracking-[0.08em] text-sidebar-foreground/45">
                {selectedWorkspace.role}
              </span>
            ) : null}
          </span>
          <ChevronsUpDown className="ml-auto size-3.5 shrink-0 text-sidebar-foreground/48 group-data-[collapsible=icon]:hidden" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-64" align="start" sideOffset={8}>
        <DropdownMenuLabel>Your workspaces</DropdownMenuLabel>
        {isError ? (
          <div className="px-2 py-3 text-xs text-destructive">
            {error?.message ?? "Unable to load workspaces."}
          </div>
        ) : (
          workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              className="min-h-10 gap-2 px-2"
              disabled={preferredMutation.isPending}
              onSelect={() => selectWorkspace(workspace.id)}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{workspace.name}</span>
                <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  {workspace.role}
                </span>
              </span>
              {workspace.id === selectedWorkspaceId ? (
                <Check className="size-4 text-primary" />
              ) : null}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onManageMembers}>
          <Users className="size-4" />
          Members and invitations
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
