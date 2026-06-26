"use client"

import { useQuery } from "@tanstack/react-query"

import { jobService } from "./job.service"
import type { ProcessingJobListQuery } from "./job.types"
import { jobQueryKeys } from "./job-query-keys"

export function useJobs(query: ProcessingJobListQuery) {
  return useQuery({
    queryKey: jobQueryKeys.list(query),
    queryFn: () => jobService.list(query),
  })
}
