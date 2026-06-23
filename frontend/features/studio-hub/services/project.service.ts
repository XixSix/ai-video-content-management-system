import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { unwrapApiResponse } from "@/lib/api/api-client"
import type { ApiSuccess } from "@/lib/api/api.types"
import type {
  CreateBlankProjectInput,
  CreateProjectFromMediaInput,
  ProjectDetail,
  ProjectListQuery,
  ProjectListResponse,
  ProjectMedia,
  UpdateProjectInput,
} from "../studio-projects.types"

export const projectService = {
  list(
    workspaceId: string,
    query: ProjectListQuery
  ): Promise<ProjectListResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<ProjectListResponse>>(
        `/workspaces/${workspaceId}/projects`,
        { params: query }
      )
    )
  },

  get(
    workspaceId: string,
    projectId: string
  ): Promise<{ project: ProjectDetail }> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<{ project: ProjectDetail }>>(
        `/workspaces/${workspaceId}/projects/${projectId}`
      )
    )
  },

  createBlank(
    workspaceId: string,
    input: CreateBlankProjectInput
  ): Promise<{ project: ProjectDetail }> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<{ project: ProjectDetail }>>(
        `/workspaces/${workspaceId}/projects/blank`,
        input
      )
    )
  },

  createFromMedia(
    workspaceId: string,
    input: CreateProjectFromMediaInput
  ): Promise<{ project: ProjectDetail }> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<{ project: ProjectDetail }>>(
        `/workspaces/${workspaceId}/projects/from-media`,
        input
      )
    )
  },

  update(
    workspaceId: string,
    projectId: string,
    input: UpdateProjectInput
  ): Promise<{ project: ProjectDetail }> {
    return unwrapApiResponse(
      authenticatedApiClient.patch<ApiSuccess<{ project: ProjectDetail }>>(
        `/workspaces/${workspaceId}/projects/${projectId}`,
        input
      )
    )
  },

  setSourceMedia(
    workspaceId: string,
    projectId: string,
    mediaId: string
  ): Promise<{ project: ProjectDetail }> {
    return unwrapApiResponse(
      authenticatedApiClient.put<ApiSuccess<{ project: ProjectDetail }>>(
        `/workspaces/${workspaceId}/projects/${projectId}/source-media`,
        { mediaId }
      )
    )
  },

  addMedia(
    workspaceId: string,
    projectId: string,
    mediaId: string
  ): Promise<{ projectMedia: ProjectMedia }> {
    return unwrapApiResponse(
      authenticatedApiClient.post<
        ApiSuccess<{ projectMedia: ProjectMedia }>
      >(`/workspaces/${workspaceId}/projects/${projectId}/media`, { mediaId })
    )
  },

  removeMedia(
    workspaceId: string,
    projectId: string,
    projectMediaId: string
  ): Promise<{ message: string }> {
    return unwrapApiResponse(
      authenticatedApiClient.delete<ApiSuccess<{ message: string }>>(
        `/workspaces/${workspaceId}/projects/${projectId}/media/${projectMediaId}`
      )
    )
  },

  remove(
    workspaceId: string,
    projectId: string
  ): Promise<{ message: string }> {
    return unwrapApiResponse(
      authenticatedApiClient.delete<ApiSuccess<{ message: string }>>(
        `/workspaces/${workspaceId}/projects/${projectId}`
      )
    )
  },
}
