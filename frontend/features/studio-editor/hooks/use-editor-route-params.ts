"use client"

import { useParams } from "next/navigation"

export function useEditorRouteParams() {
  const params = useParams<{ workspaceId: string; projectId: string }>()

  return {
    workspaceId: params.workspaceId ?? "",
    projectId: params.projectId ?? "",
  }
}
