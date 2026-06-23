export const platformAccountsQueryKeys = {
  all: ["platform-accounts"] as const,
  list: (workspaceId: string) =>
    [...platformAccountsQueryKeys.all, workspaceId, "list"] as const,
}
