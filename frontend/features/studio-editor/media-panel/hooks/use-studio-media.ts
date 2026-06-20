"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { useMediaList } from "@/features/media-library/hooks/use-media-list"
import { invalidateMediaQueries } from "@/features/media-library/hooks/use-media-mutations"
import { readMediaFileMetadata } from "@/features/media-library/lib/read-media-file-metadata"
import type {
  MediaLibraryItem,
  MediaResponseData,
} from "@/features/media-library/media-library.types"
import {
  getMediaUploadDescriptor,
  uploadMediaFile,
} from "@/features/media-library/services/media.service"
import { projectQueryKeys } from "@/features/studio-hub/hooks/project-query-keys"
import { projectService } from "@/features/studio-hub/services/project.service"
import type { ProjectDetail } from "@/features/studio-hub/studio-projects.types"
import {
  useStudioEditorPermission,
  useStudioProjectActions,
} from "@/features/studio-editor/store/studio-editor-store"
import type { StudioProjectMediaItem } from "@/features/studio-editor/studio.types"
import { ApiError } from "@/lib/api/api-error"

import { createProjectMediaFromResponse } from "../services/project-media-adapter"

export type StudioMediaUploadEntry = {
  id: string
  file: File
  media: MediaResponseData | null
  progress: number
  status: "uploading" | "attaching" | "attach-error" | "failed"
  error: string | null
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again."
}

export function useStudioMedia() {
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId ?? ""
  const canEdit = useStudioEditorPermission()
  const authSession = useAuthSession()
  const queryClient = useQueryClient()
  const { removeProjectMedia, upsertProjectMedia } = useStudioProjectActions()
  const [uploadEntries, setUploadEntries] = useState<
    StudioMediaUploadEntry[]
  >([])
  const controllersRef = useRef(new Map<string, AbortController>())
  const mediaListQuery = useMediaList({
    page: 1,
    limit: 50,
    status: "UPLOADED",
    sortBy: "createdAt",
    sortOrder: "desc",
  })

  const updateProjectCache = useCallback(
    (updater: (project: ProjectDetail) => ProjectDetail) => {
      queryClient.setQueryData<{ project: ProjectDetail }>(
        projectQueryKeys.detail(projectId),
        (current) =>
          current
            ? {
                project: updater(current.project),
              }
            : current
      )
    },
    [projectId, queryClient]
  )

  const applyAttachedMedia = useCallback(
    (projectMedia: Awaited<ReturnType<typeof projectService.addMedia>>["projectMedia"]) => {
      upsertProjectMedia(createProjectMediaFromResponse(projectMedia))
      updateProjectCache((project) => ({
        ...project,
        projectMedia: project.projectMedia.some(
          (item) => item.id === projectMedia.id
        )
          ? project.projectMedia
          : [...project.projectMedia, projectMedia],
      }))
    },
    [updateProjectCache, upsertProjectMedia]
  )

  const reconcileProjectMedia = useCallback(
    async (mediaId: string) => {
      const result = await projectService.get(projectId)
      queryClient.setQueryData(projectQueryKeys.detail(projectId), result)
      const attached = result.project.projectMedia.find(
        (item) => item.media.id === mediaId
      )

      if (attached) {
        upsertProjectMedia(createProjectMediaFromResponse(attached))
      }

      return attached
    },
    [projectId, queryClient, upsertProjectMedia]
  )

  const attachMutation = useMutation({
    mutationFn: (mediaId: string) => projectService.addMedia(projectId, mediaId),
    onSuccess: ({ projectMedia }) => {
      applyAttachedMedia(projectMedia)
      toast.success("Media added to project")
    },
    onError: (error, mediaId) => {
      if (
        error instanceof ApiError &&
        error.code === "PROJECT_MEDIA_CONFLICT"
      ) {
        void reconcileProjectMedia(mediaId)
        toast.info("Media is already attached")
        return
      }

      toast.error("Could not add media", {
        description: getErrorMessage(error),
      })
    },
  })

  const detachMutation = useMutation({
    mutationFn: ({
      mediaId,
      projectMediaId,
    }: {
      mediaId: string
      projectMediaId: string
    }) => projectService.removeMedia(projectId, projectMediaId).then(() => mediaId),
    onSuccess: (mediaId, { projectMediaId }) => {
      removeProjectMedia(mediaId)
      updateProjectCache((project) => ({
        ...project,
        projectMedia: project.projectMedia.filter(
          (item) => item.id !== projectMediaId
        ),
      }))
      toast.success("Media removed from project")
    },
    onError: (error) => {
      toast.error("Could not remove media", {
        description: getErrorMessage(error),
      })
    },
  })

  const updateUploadEntry = useCallback(
    (entryId: string, update: Partial<StudioMediaUploadEntry>) => {
      setUploadEntries((current) =>
        current.map((entry) =>
          entry.id === entryId ? { ...entry, ...update } : entry
        )
      )
    },
    []
  )

  const attachUploadedMedia = useCallback(
    async (
      entryId: string,
      file: File,
      media: MediaResponseData
    ) => {
      updateUploadEntry(entryId, {
        error: null,
        media,
        progress: 100,
        status: "attaching",
      })

      try {
        const { projectMedia } = await projectService.addMedia(
          projectId,
          media.id
        )
        applyAttachedMedia(projectMedia)
        setUploadEntries((current) =>
          current.filter((entry) => entry.id !== entryId)
        )
        toast.success("Upload added to project", {
          description: file.name,
        })
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.code === "PROJECT_MEDIA_CONFLICT"
        ) {
          const attached = await reconcileProjectMedia(media.id)

          if (attached) {
            setUploadEntries((current) =>
              current.filter((entry) => entry.id !== entryId)
            )
            toast.info("Upload is already attached to this project")
            return
          }
        }

        updateUploadEntry(entryId, {
          error: getErrorMessage(error),
          media,
          status: "attach-error",
        })
        toast.error("Uploaded, but not attached", {
          description: "The file is safe in Media Library. Retry attaching it.",
        })
      }
    },
    [
      applyAttachedMedia,
      projectId,
      reconcileProjectMedia,
      updateUploadEntry,
    ]
  )

  const startUpload = useCallback(
    async (entryId: string, file: File) => {
      const workspaceId = authSession.data?.workspaceId

      if (!workspaceId) {
        updateUploadEntry(entryId, {
          error: "No workspace is available for this account.",
          status: "failed",
        })
        return
      }

      const controller = new AbortController()
      controllersRef.current.set(entryId, controller)
      updateUploadEntry(entryId, {
        error: null,
        media: null,
        progress: 0,
        status: "uploading",
      })

      try {
        const descriptor = getMediaUploadDescriptor(file)
        const metadata = await readMediaFileMetadata(
          file,
          descriptor.mediaType
        )
        const media = await uploadMediaFile({
          file,
          workspaceId,
          metadata,
          signal: controller.signal,
          onProgress: (progress) =>
            updateUploadEntry(entryId, { progress }),
        })

        await invalidateMediaQueries(queryClient)
        await attachUploadedMedia(entryId, file, media)
      } catch (error) {
        const aborted = controller.signal.aborted
        updateUploadEntry(entryId, {
          error: aborted ? "Upload canceled." : getErrorMessage(error),
          status: "failed",
        })

        if (!aborted) {
          toast.error("Upload failed", {
            description: getErrorMessage(error),
          })
        }
      } finally {
        controllersRef.current.delete(entryId)
      }
    },
    [
      attachUploadedMedia,
      authSession.data?.workspaceId,
      queryClient,
      updateUploadEntry,
    ]
  )

  const addFiles = useCallback(
    (files: File[]) => {
      if (!canEdit) return

      const accepted: StudioMediaUploadEntry[] = []

      files.forEach((file) => {
        try {
          getMediaUploadDescriptor(file)
          accepted.push({
            id: `studio-upload-${crypto.randomUUID()}`,
            file,
            media: null,
            progress: 0,
            status: "uploading",
            error: null,
          })
        } catch (error) {
          toast.error("Unsupported media file", {
            description: getErrorMessage(error),
          })
        }
      })

      if (!accepted.length) return

      setUploadEntries((current) => [...accepted, ...current])
      accepted.forEach((entry) => {
        void startUpload(entry.id, entry.file)
      })
    },
    [canEdit, startUpload]
  )

  const retryUploadEntry = useCallback(
    (entry: StudioMediaUploadEntry) => {
      if (entry.media) {
        void attachUploadedMedia(entry.id, entry.file, entry.media)
        return
      }

      void startUpload(entry.id, entry.file)
    },
    [attachUploadedMedia, startUpload]
  )

  const cancelUploadEntry = useCallback((entryId: string) => {
    controllersRef.current.get(entryId)?.abort()
  }, [])

  const dismissUploadEntry = useCallback((entryId: string) => {
    controllersRef.current.get(entryId)?.abort()
    controllersRef.current.delete(entryId)
    setUploadEntries((current) =>
      current.filter((entry) => entry.id !== entryId)
    )
  }, [])

  useEffect(
    () => () => {
      controllersRef.current.forEach((controller) => controller.abort())
      controllersRef.current.clear()
    },
    []
  )

  return {
    addFiles,
    attachMedia: (item: MediaLibraryItem) => {
      if (canEdit) attachMutation.mutate(item.id)
    },
    attachingMediaId: attachMutation.variables ?? null,
    canEdit,
    cancelUploadEntry,
    detachMedia: (item: StudioProjectMediaItem) => {
      if (canEdit && item.projectMediaId) {
        detachMutation.mutate({
          mediaId: item.id,
          projectMediaId: item.projectMediaId,
        })
      }
    },
    detachingMediaId: detachMutation.variables?.mediaId ?? null,
    dismissUploadEntry,
    libraryItems: mediaListQuery.data?.items ?? [],
    libraryError: mediaListQuery.error,
    libraryLoading: mediaListQuery.isLoading,
    refetchLibrary: mediaListQuery.refetch,
    retryUploadEntry,
    uploadEntries,
  }
}
