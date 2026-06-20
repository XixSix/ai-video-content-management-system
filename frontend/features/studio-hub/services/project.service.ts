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
  list(query: ProjectListQuery): Promise<ProjectListResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<ProjectListResponse>>("/projects", {
        params: query,
      })
    )
  },

  get(projectId: string): Promise<{ project: ProjectDetail }> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<{ project: ProjectDetail }>>(
        `/projects/${projectId}`
      )
    )
  },

  createBlank(
    input: CreateBlankProjectInput
  ): Promise<{ project: ProjectDetail }> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<{ project: ProjectDetail }>>(
        "/projects/blank",
        input
      )
    )
  },

  createFromMedia(
    input: CreateProjectFromMediaInput
  ): Promise<{ project: ProjectDetail }> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<{ project: ProjectDetail }>>(
        "/projects/from-media",
        input
      )
    )
  },

  update(
    projectId: string,
    input: UpdateProjectInput
  ): Promise<{ project: ProjectDetail }> {
    return unwrapApiResponse(
      authenticatedApiClient.patch<ApiSuccess<{ project: ProjectDetail }>>(
        `/projects/${projectId}`,
        input
      )
    )
  },

  addMedia(
    projectId: string,
    mediaId: string
  ): Promise<{ projectMedia: ProjectMedia }> {
    return unwrapApiResponse(
      authenticatedApiClient.post<
        ApiSuccess<{ projectMedia: ProjectMedia }>
      >(`/projects/${projectId}/media`, { mediaId })
    )
  },

  removeMedia(
    projectId: string,
    projectMediaId: string
  ): Promise<{ message: string }> {
    return unwrapApiResponse(
      authenticatedApiClient.delete<ApiSuccess<{ message: string }>>(
        `/projects/${projectId}/media/${projectMediaId}`
      )
    )
  },

  remove(projectId: string): Promise<{ message: string }> {
    return unwrapApiResponse(
      authenticatedApiClient.delete<ApiSuccess<{ message: string }>>(
        `/projects/${projectId}`
      )
    )
  },
}
