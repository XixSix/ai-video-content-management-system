import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { unwrapApiResponse } from "@/lib/api/api-client"
import type { ApiSuccess } from "@/lib/api/api.types"

import type {
  ExportTranscriptInput,
  GenerateTranscriptInput,
  SaveTranscriptEditorDraftInput,
  TranscriptEditorData,
  TranscriptSummaryData,
} from "./transcript.types"
import type { ProcessingJobResponse } from "@/features/jobs/job.types"

export const transcriptService = {
  generate(
    mediaId: string,
    input: GenerateTranscriptInput = {}
  ): Promise<ProcessingJobResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<ProcessingJobResponse>>(
        `/media/${mediaId}/transcripts/generate`,
        input
      )
    )
  },

  listByMedia(mediaId: string): Promise<{ transcripts: TranscriptSummaryData[] }> {
    return unwrapApiResponse(
      authenticatedApiClient.get<
        ApiSuccess<{ transcripts: TranscriptSummaryData[] }>
      >(`/media/${mediaId}/transcripts`)
    )
  },

  getEditor(transcriptId: string): Promise<TranscriptEditorData> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<TranscriptEditorData>>(
        `/transcripts/${transcriptId}/editor`
      )
    )
  },

  saveEditorDraft(
    transcriptId: string,
    input: SaveTranscriptEditorDraftInput
  ): Promise<{ draft: NonNullable<TranscriptEditorData["draft"]> }> {
    return unwrapApiResponse(
      authenticatedApiClient.patch<
        ApiSuccess<{ draft: NonNullable<TranscriptEditorData["draft"]> }>
      >(`/transcripts/${transcriptId}/editor/draft`, input)
    )
  },

  export(
    transcriptId: string,
    input: ExportTranscriptInput
  ): Promise<ProcessingJobResponse> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<ProcessingJobResponse>>(
        `/transcripts/${transcriptId}/export`,
        input
      )
    )
  },
}
