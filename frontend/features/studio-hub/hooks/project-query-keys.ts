import type { ProjectListQuery } from "../studio-projects.types"

export const projectQueryKeys = {
  all: ["projects"] as const,
  workspace: (workspaceId: string) =>
    [...projectQueryKeys.all, workspaceId] as const,
  lists: (workspaceId: string) =>
    [...projectQueryKeys.workspace(workspaceId), "list"] as const,
  list: (workspaceId: string, query: ProjectListQuery) =>
    [...projectQueryKeys.lists(workspaceId), query] as const,
  detail: (workspaceId: string, projectId: string) =>
    [...projectQueryKeys.workspace(workspaceId), "detail", projectId] as const,
}
