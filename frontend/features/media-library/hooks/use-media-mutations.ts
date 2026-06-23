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

export async function invalidateMediaQueries(
  queryClient: QueryClient,
  workspaceId: string
) {
  await queryClient.invalidateQueries({
    queryKey: mediaQueryKeys.lists(workspaceId),
  })
}

export function useRenameMedia(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      mediaId,
      title,
    }: {
      mediaId: string
      title: string
    }) => mediaService.update(workspaceId, mediaId, { title }),
    onMutate: async ({ mediaId, title }) => {
      await queryClient.cancelQueries({
        queryKey: mediaQueryKeys.lists(workspaceId),
      })
      const snapshots = queryClient.getQueriesData<MediaListResponseData>({
        queryKey: mediaQueryKeys.lists(workspaceId),
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
    onSettled: () => invalidateMediaQueries(queryClient, workspaceId),
  })
}

export function useDeleteMedia(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mediaId: string) => mediaService.remove(workspaceId, mediaId),
    onSuccess: () => invalidateMediaQueries(queryClient, workspaceId),
  })
}

export function useMediaPreviewUrl(
  workspaceId: string,
  mediaId: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: mediaQueryKeys.preview(workspaceId, mediaId ?? "none"),
    queryFn: () => mediaService.getPreviewUrl(workspaceId, mediaId!),
    enabled: Boolean(workspaceId) && Boolean(mediaId) && enabled,
    staleTime: 4 * 60 * 1000,
    retry: 1,
  })
}
