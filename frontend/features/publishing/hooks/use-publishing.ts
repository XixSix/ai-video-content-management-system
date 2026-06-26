"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type {
  CreatePublishTaskInput,
  PublishTaskListQuery,
  UpdatePublishTaskInput,
} from "../services/publishing.service"
import { publishingService } from "../services/publishing.service"
import { publishingQueryKeys } from "./publishing-query-keys"

function invalidatePublishing(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: publishingQueryKeys.all })
}

export function usePublishTasks(query: PublishTaskListQuery) {
  return useQuery({
    queryKey: publishingQueryKeys.list(query),
    queryFn: () => publishingService.list(query),
  })
}

export function useCreatePublishTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreatePublishTaskInput) => publishingService.create(input),
    onSuccess: () => invalidatePublishing(queryClient),
  })
}

export function useUpdatePublishTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      input,
      publishTaskId,
    }: {
      publishTaskId: string
      input: UpdatePublishTaskInput
    }) => publishingService.update(publishTaskId, input),
    onSuccess: () => invalidatePublishing(queryClient),
  })
}

export function usePublishNowTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (publishTaskId: string) => publishingService.publish(publishTaskId),
    onSuccess: () => invalidatePublishing(queryClient),
  })
}

export function useSchedulePublishTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      publishTaskId,
      scheduledAt,
    }: {
      publishTaskId: string
      scheduledAt: string
    }) => publishingService.schedule(publishTaskId, scheduledAt),
    onSuccess: () => invalidatePublishing(queryClient),
  })
}

export function useCancelPublishTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (publishTaskId: string) => publishingService.cancel(publishTaskId),
    onSuccess: () => invalidatePublishing(queryClient),
  })
}
