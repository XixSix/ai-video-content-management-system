import type { PublishTaskListQuery } from "../services/publishing.service"

export const publishingQueryKeys = {
  all: ["publishing"] as const,
  lists: () => [...publishingQueryKeys.all, "list"] as const,
  list: (query: PublishTaskListQuery) =>
    [...publishingQueryKeys.lists(), query] as const,
  detail: (publishTaskId: string) =>
    [...publishingQueryKeys.all, "detail", publishTaskId] as const,
}
