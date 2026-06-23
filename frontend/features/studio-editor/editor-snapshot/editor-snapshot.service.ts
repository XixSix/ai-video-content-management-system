import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { unwrapApiResponse } from "@/lib/api/api-client"
import type { ApiSuccess } from "@/lib/api/api.types"

import {
  editorSnapshotResponseSchema,
  type EditorSnapshotResponse,
} from "./editor-snapshot.schema"
import type { SaveEditorSnapshotInput } from "./editor-snapshot.types"

function parseSnapshotResponse(data: EditorSnapshotResponse) {
  return editorSnapshotResponseSchema.parse(data)
}

export const editorSnapshotService = {
  async get(
    workspaceId: string,
    projectId: string
  ): Promise<EditorSnapshotResponse> {
    const data = await unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<EditorSnapshotResponse>>(
        `/workspaces/${workspaceId}/projects/${projectId}/editor-snapshot`
      )
    )

    return parseSnapshotResponse(data)
  },

  async save(
    workspaceId: string,
    projectId: string,
    input: SaveEditorSnapshotInput
  ): Promise<EditorSnapshotResponse> {
    const data = await unwrapApiResponse(
      authenticatedApiClient.put<ApiSuccess<EditorSnapshotResponse>>(
        `/workspaces/${workspaceId}/projects/${projectId}/editor-snapshot`,
        input
      )
    )

    return parseSnapshotResponse(data)
  },
}
