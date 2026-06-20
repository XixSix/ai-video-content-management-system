import type { ProjectListQuery } from "../studio-projects.types"

export const projectQueryKeys = {
  all: ["projects"] as const,
  lists: () => [...projectQueryKeys.all, "list"] as const,
  list: (query: ProjectListQuery) =>
    [...projectQueryKeys.lists(), query] as const,
  detail: (projectId: string) =>
    [...projectQueryKeys.all, "detail", projectId] as const,
}
