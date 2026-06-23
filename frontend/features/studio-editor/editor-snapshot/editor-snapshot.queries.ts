"use client"

import { useQuery } from "@tanstack/react-query"

import { editorSnapshotService } from "./editor-snapshot.service"

export const editorSnapshotQueryKeys = {
  detail: (workspaceId: string, projectId: string) =>
    ["editor-snapshot", workspaceId, "detail", projectId] as const,
}

export function useEditorSnapshot(workspaceId: string, projectId: string) {
  return useQuery({
    queryKey: editorSnapshotQueryKeys.detail(workspaceId, projectId),
    queryFn: () => editorSnapshotService.get(workspaceId, projectId),
    enabled: Boolean(workspaceId) && Boolean(projectId),
  })
}
