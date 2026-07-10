import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import type { ProcessingJobData } from "@/features/jobs/job.types"
import { unwrapApiResponse } from "@/lib/api/api-client"
import type { ApiSuccess } from "@/lib/api/api.types"

import type { PublishPlatform, PublishTaskStatus } from "../publishing.types"

export type PublishTaskSourceResponse = {
  type: "MEDIA" | "PROJECT" | "SHORT_CLIP"
  id: string
  title: string
  thumbnailUrl: string | null
  duration: number | null
  aspectRatio: string | null
  mediaType: string | null
}

export type PublishTaskPlatformAccountResponse = {
  id: string
  platform: PublishPlatform
  accountName: string | null
  avatarUrl: string | null
  status: string
}

export type PublishTaskResponseData = {
  id: string
  userId: string
  mediaId: string | null
  projectId: string | null
  shortClipId: string | null
  platformAccountId: string | null
  jobId: string | null
  platform: PublishPlatform
  title: string | null
  caption: string | null
  description: string | null
  hashtags: unknown
  status: PublishTaskStatus
  scheduledAt: string | null
  publishedAt: string | null
  platformPostId: string | null
  platformPostUrl: string | null
  errorCode: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  source: PublishTaskSourceResponse | null
  platformAccount: PublishTaskPlatformAccountResponse | null
}

export type PublishTaskListQuery = {
  page?: number
  limit?: number
  search?: string
  platform?: PublishPlatform
  status?: PublishTaskStatus
  mediaId?: string
  projectId?: string
  shortClipId?: string
  platformAccountId?: string
  sortBy?: "createdAt" | "scheduledAt" | "publishedAt"
  sortOrder?: "asc" | "desc"
}

export type CreatePublishTaskInput = {
  mediaId?: string
  projectId?: string
  shortClipId?: string
  platform: PublishPlatform
  platformAccountId: string
  title?: string
  caption?: string
  description?: string
  hashtags?: string[]
  scheduledAt?: string
}

export type UpdatePublishTaskInput = {
  platformAccountId?: string
  title?: string | null
  caption?: string | null
  description?: string | null
  hashtags?: string[] | null
  scheduledAt?: string | null
}

export type PublishTaskListResponse = {
  items: PublishTaskResponseData[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export type PublishTaskResponse = {
  publishTask: PublishTaskResponseData
}

export type PublishTaskActionResponse = {
  publishTask: PublishTaskResponseData
  job: ProcessingJobData
}

export const publishingService = {
  list(query: PublishTaskListQuery): Promise<PublishTaskListResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<PublishTaskListResponse>>(
        "/publish-tasks",
        { params: query }
      )
    )
  },

  create(input: CreatePublishTaskInput): Promise<PublishTaskResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<PublishTaskResponse>>(
        "/publish-tasks",
        input
      )
    )
  },

  update(
    publishTaskId: string,
    input: UpdatePublishTaskInput
  ): Promise<PublishTaskResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.patch<ApiSuccess<PublishTaskResponse>>(
        `/publish-tasks/${publishTaskId}`,
        input
      )
    )
  },

  publish(publishTaskId: string): Promise<PublishTaskActionResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<PublishTaskActionResponse>>(
        `/publish-tasks/${publishTaskId}/publish`
      )
    )
  },

  schedule(
    publishTaskId: string,
    scheduledAt: string
  ): Promise<PublishTaskActionResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<PublishTaskActionResponse>>(
        `/publish-tasks/${publishTaskId}/schedule`,
        { scheduledAt }
      )
    )
  },

  cancel(publishTaskId: string): Promise<PublishTaskResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<PublishTaskResponse>>(
        `/publish-tasks/${publishTaskId}/cancel`
      )
    )
  },
}
