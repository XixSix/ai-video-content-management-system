"use client"

import { useQuery } from "@tanstack/react-query"

import { editorSnapshotService } from "./editor-snapshot.service"

export const editorSnapshotQueryKeys = {
  detail: (projectId: string) =>
    ["editor-snapshot", "detail", projectId] as const,
}

export function useEditorSnapshot(projectId: string) {
  return useQuery({
    queryKey: editorSnapshotQueryKeys.detail(projectId),
    queryFn: () => editorSnapshotService.get(projectId),
    enabled: Boolean(projectId),
  })
}
