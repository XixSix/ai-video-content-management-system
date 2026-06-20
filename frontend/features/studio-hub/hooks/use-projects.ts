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

async function invalidateProjectLists(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: projectQueryKeys.lists() })
}

export function useProjectList(query: ProjectListQuery) {
  return useQuery({
    queryKey: projectQueryKeys.list(query),
    queryFn: () => projectService.list(query),
  })
}

export function useProjectDetail(projectId: string) {
  return useQuery({
    queryKey: projectQueryKeys.detail(projectId),
    queryFn: () => projectService.get(projectId),
    enabled: Boolean(projectId),
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (
      input:
        | { mode: "blank"; data: CreateBlankProjectInput }
        | { mode: "from-media"; data: CreateProjectFromMediaInput }
    ) =>
      input.mode === "blank"
        ? projectService.createBlank(input.data)
        : projectService.createFromMedia(input.data),
    onSuccess: ({ project }) => {
      queryClient.setQueryData(projectQueryKeys.detail(project.id), { project })
      void invalidateProjectLists(queryClient)
    },
  })
}

export function useRenameProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      title,
    }: {
      projectId: string
      title: string
    }) => projectService.update(projectId, { title }),
    onMutate: async ({ projectId, title }) => {
      await queryClient.cancelQueries({ queryKey: projectQueryKeys.lists() })
      const snapshots = queryClient.getQueriesData<ProjectListResponse>({
        queryKey: projectQueryKeys.lists(),
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
      queryClient.setQueryData(projectQueryKeys.detail(project.id), { project })
    },
    onSettled: () => invalidateProjectLists(queryClient),
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => projectService.remove(projectId),
    onSuccess: () => invalidateProjectLists(queryClient),
  })
}
