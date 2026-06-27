import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { unwrapApiResponse } from "@/lib/api/api-client"
import type { ApiSuccess } from "@/lib/api/api.types"

import type {
  ClipCandidateData,
  ClipCandidateListQuery,
  GenerateShortClipsPreferences,
  GenerateShortClipsResponse,
  PaginatedApiResponse,
  ShortClipData,
  ShortClipListQuery,
} from "./short-clips.types"

export const shortClipsService = {
  generate(
    mediaId: string,
    preferences: GenerateShortClipsPreferences
  ): Promise<GenerateShortClipsResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<GenerateShortClipsResponse>>(
        `/media/${mediaId}/short-clips/generate`,
        preferences
      )
    )
  },

  listCandidates(
    mediaId: string,
    query: ClipCandidateListQuery
  ): Promise<PaginatedApiResponse<ClipCandidateData>> {
    return unwrapApiResponse(
      authenticatedApiClient.get<
        ApiSuccess<PaginatedApiResponse<ClipCandidateData>>
      >(`/media/${mediaId}/clip-candidates`, { params: query })
    )
  },

  listShortClips(
    mediaId: string,
    query: ShortClipListQuery
  ): Promise<PaginatedApiResponse<ShortClipData>> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<PaginatedApiResponse<ShortClipData>>>(
        `/media/${mediaId}/short-clips`,
        { params: query }
      )
    )
  },

  getDownloadUrl(
    shortClipId: string
  ): Promise<{ url: string; expiresInSeconds: number }> {
    return unwrapApiResponse(
      authenticatedApiClient.get<
        ApiSuccess<{ url: string; expiresInSeconds: number }>
      >(`/short-clips/${shortClipId}/download-url`)
    )
  },
}
