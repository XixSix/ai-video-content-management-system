import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import type { ProcessingJobResponse } from "@/features/jobs/job.types"
import { unwrapApiResponse } from "@/lib/api/api-client"
import type { ApiSuccess } from "@/lib/api/api.types"

import type { ChapterData, GenerateChaptersInput } from "./chapter.types"

export const chapterService = {
  generate(
    mediaId: string,
    input: GenerateChaptersInput = {}
  ): Promise<ProcessingJobResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<ProcessingJobResponse>>(
        `/media/${mediaId}/chapters/generate`,
        input
      )
    )
  },

  listByMedia(mediaId: string): Promise<{ chapters: ChapterData[] }> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<{ chapters: ChapterData[] }>>(
        `/media/${mediaId}/chapters`
      )
    )
  },
}
