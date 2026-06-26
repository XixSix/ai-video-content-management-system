"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { chapterService } from "./chapter.service"
import { chapterQueryKeys } from "./chapter-query-keys"
import type { GenerateChaptersInput } from "./chapter.types"

export function useMediaChapters(mediaId: string | null | undefined) {
  return useQuery({
    queryKey: chapterQueryKeys.media(mediaId ?? ""),
    queryFn: () => chapterService.listByMedia(mediaId!),
    enabled: Boolean(mediaId),
  })
}

export function useGenerateChapters(mediaId: string | null | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: GenerateChaptersInput = {}) =>
      chapterService.generate(mediaId!, input),
    onSuccess: () => {
      if (!mediaId) return

      void queryClient.invalidateQueries({
        queryKey: chapterQueryKeys.media(mediaId),
      })
    },
  })
}
