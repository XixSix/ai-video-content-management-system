"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import type { MediaListResponseData } from "../media-library.types"
import { mediaService } from "../services/media.service"
import { mediaQueryKeys } from "./media-query-keys"

export async function invalidateMediaQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: mediaQueryKeys.lists() })
}

export function useRenameMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      mediaId,
      title,
    }: {
      mediaId: string
      title: string
    }) => mediaService.update(mediaId, { title }),
    onMutate: async ({ mediaId, title }) => {
      await queryClient.cancelQueries({ queryKey: mediaQueryKeys.lists() })
      const snapshots = queryClient.getQueriesData<MediaListResponseData>({
        queryKey: mediaQueryKeys.lists(),
      })

      snapshots.forEach(([queryKey, data]) => {
        if (!data) return
        queryClient.setQueryData<MediaListResponseData>(queryKey, {
          ...data,
          items: data.items.map((item) =>
            item.id === mediaId
              ? { ...item, title, updatedAt: new Date().toISOString() }
              : item
          ),
        })
      })

      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data)
      })
    },
    onSettled: () => invalidateMediaQueries(queryClient),
  })
}

export function useDeleteMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mediaId: string) => mediaService.remove(mediaId),
    onSuccess: () => invalidateMediaQueries(queryClient),
  })
}

export function useMediaPreviewUrl(mediaId: string | null, enabled = true) {
  return useQuery({
    queryKey: mediaQueryKeys.preview(mediaId ?? "none"),
    queryFn: () => mediaService.getPreviewUrl(mediaId!),
    enabled: Boolean(mediaId) && enabled,
    staleTime: 5 * 60 * 1000,
  })
}
