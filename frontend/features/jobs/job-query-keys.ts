import type { ProcessingJobListQuery } from "./job.types"

export const jobQueryKeys = {
  all: ["jobs"] as const,
  lists: () => [...jobQueryKeys.all, "list"] as const,
  list: (query: ProcessingJobListQuery) =>
    [...jobQueryKeys.lists(), query] as const,
  detail: (jobId: string) => [...jobQueryKeys.all, "detail", jobId] as const,
}
