"use client"

import { useMutation, useQuery } from "@tanstack/react-query"

import { renderExportService, isTerminalRenderExportJob } from "./render-export.service"

export const renderExportQueryKeys = {
  job: (jobId: string) => ["render-export", "job", jobId] as const,
}

export function useCreateRenderExport(workspaceId: string, projectId: string) {
  return useMutation({
    mutationFn: () => renderExportService.create(workspaceId, projectId),
  })
}

export function useRenderExportJob(jobId: string | null, enabled = true) {
  return useQuery({
    queryKey: renderExportQueryKeys.job(jobId ?? "none"),
    queryFn: () => renderExportService.getJob(jobId!),
    enabled: Boolean(jobId) && enabled,
    refetchInterval: (query) => {
      const job = query.state.data?.job

      return job && isTerminalRenderExportJob(job) ? false : 2000
    },
  })
}

export function subscribeToRenderExportJobEvents(
  ...args: Parameters<typeof renderExportService.subscribeToJobEvents>
) {
  return renderExportService.subscribeToJobEvents(...args)
}
