export const workspaceQueryKeys = {
  all: ["workspaces"] as const,
  list: () => [...workspaceQueryKeys.all, "list"] as const,
  detail: (workspaceId: string) =>
    [...workspaceQueryKeys.all, workspaceId, "detail"] as const,
  members: (workspaceId: string) =>
    [...workspaceQueryKeys.all, workspaceId, "members"] as const,
}
