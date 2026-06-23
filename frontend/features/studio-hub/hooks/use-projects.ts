"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { projectService } from "../services/project.service"
import type {
  CreateBlankProjectInput,
  CreateProjectFromMediaInput,
  ProjectListQuery,
  ProjectListResponse,
} from "../studio-projects.types"
import { projectQueryKeys } from "./project-query-keys"

async function invalidateProjectLists(
  queryClient: QueryClient,
  workspaceId: string
) {
  await queryClient.invalidateQueries({
    queryKey: projectQueryKeys.lists(workspaceId),
  })
}

export function useProjectList(workspaceId: string, query: ProjectListQuery) {
  return useQuery({
    queryKey: projectQueryKeys.list(workspaceId, query),
    queryFn: () => projectService.list(workspaceId, query),
    enabled: Boolean(workspaceId),
  })
}

export function useProjectDetail(workspaceId: string, projectId: string) {
  return useQuery({
    queryKey: projectQueryKeys.detail(workspaceId, projectId),
    queryFn: () => projectService.get(workspaceId, projectId),
    enabled: Boolean(workspaceId) && Boolean(projectId),
  })
}

export function useCreateProject(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (
      input:
        | { mode: "blank"; data: CreateBlankProjectInput }
        | { mode: "from-media"; data: CreateProjectFromMediaInput }
    ) =>
      input.mode === "blank"
        ? projectService.createBlank(workspaceId, input.data)
        : projectService.createFromMedia(workspaceId, input.data),
    onSuccess: ({ project }) => {
      queryClient.setQueryData(
        projectQueryKeys.detail(workspaceId, project.id),
        { project }
      )
      void invalidateProjectLists(queryClient, workspaceId)
    },
  })
}

export function useRenameProject(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      title,
    }: {
      projectId: string
      title: string
    }) => projectService.update(workspaceId, projectId, { title }),
    onMutate: async ({ projectId, title }) => {
      await queryClient.cancelQueries({
        queryKey: projectQueryKeys.lists(workspaceId),
      })
      const snapshots = queryClient.getQueriesData<ProjectListResponse>({
        queryKey: projectQueryKeys.lists(workspaceId),
      })

      snapshots.forEach(([queryKey, data]) => {
        if (!data) return

        queryClient.setQueryData<ProjectListResponse>(queryKey, {
          ...data,
          items: data.items.map((project) =>
            project.id === projectId
              ? { ...project, title, updatedAt: new Date().toISOString() }
              : project
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
    onSuccess: ({ project }) => {
      queryClient.setQueryData(
        projectQueryKeys.detail(workspaceId, project.id),
        { project }
      )
    },
    onSettled: () => invalidateProjectLists(queryClient, workspaceId),
  })
}

export function useDeleteProject(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) =>
      projectService.remove(workspaceId, projectId),
    onSuccess: () => invalidateProjectLists(queryClient, workspaceId),
  })
}
