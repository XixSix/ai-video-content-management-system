"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { transcriptService } from "./transcript.service"
import type {
  ExportTranscriptInput,
  GenerateTranscriptInput,
  SaveTranscriptEditorDraftInput,
} from "./transcript.types"
import { transcriptQueryKeys } from "./transcript-query-keys"

export function useMediaTranscripts(mediaId: string | null | undefined) {
  return useQuery({
    queryKey: transcriptQueryKeys.media(mediaId ?? ""),
    queryFn: () => transcriptService.listByMedia(mediaId!),
    enabled: Boolean(mediaId),
  })
}

export function useGenerateTranscript(mediaId: string | null | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: GenerateTranscriptInput = {}) =>
      transcriptService.generate(mediaId!, input),
    onSuccess: () => {
      if (!mediaId) return

      void queryClient.invalidateQueries({
        queryKey: transcriptQueryKeys.media(mediaId),
      })
    },
  })
}

export function useTranscriptEditor(transcriptId: string | null | undefined) {
  return useQuery({
    queryKey: transcriptQueryKeys.editor(transcriptId ?? ""),
    queryFn: () => transcriptService.getEditor(transcriptId!),
    enabled: Boolean(transcriptId),
  })
}

export function useExportTranscript(transcriptId: string | null | undefined) {
  return useMutation({
    mutationFn: (input: ExportTranscriptInput) =>
      transcriptService.export(transcriptId!, input),
  })
}

export function useSaveTranscriptEditorDraft(transcriptId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SaveTranscriptEditorDraftInput) =>
      transcriptService.saveEditorDraft(transcriptId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: transcriptQueryKeys.editor(transcriptId),
      })
    },
  })
}
