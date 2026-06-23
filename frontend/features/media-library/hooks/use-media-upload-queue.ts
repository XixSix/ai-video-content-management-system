"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { MediaLibraryItem } from "../media-library.types"
import {
  getMediaUploadDescriptor,
  uploadMediaFile,
} from "../services/media.service"
import { readMediaFileMetadata } from "../lib/read-media-file-metadata"
import { mediaQueryKeys } from "./media-query-keys"

type UploadQueueEntry = {
  file: File
  item: MediaLibraryItem
  workspaceId: string
}

function getLocalUploadItem(file: File, id: string): MediaLibraryItem {
  const descriptor = getMediaUploadDescriptor(file)
  const now = new Date().toISOString()

  return {
    id,
    title: file.name.replace(/\.[^/.]+$/, "") || file.name,
    originalFilename: file.name,
    assetUrl: null,
    thumbnailUrl: null,
    duration: null,
    fileSizeBytes: file.size,
    mimeType: descriptor.mimeType,
    type: descriptor.mediaType === "SUBTITLE" ? "TRANSCRIPT" : descriptor.mediaType,
    libraryGroup: "ORIGINAL",
    status: "UPLOADING",
    width: null,
    height: null,
    createdAt: now,
    updatedAt: now,
    hasTranscript: false,
    hasChapters: false,
    hasClips: false,
    hasSubtitles: descriptor.mediaType === "SUBTITLE",
    activeJobCount: 0,
    uploadProgress: 0,
  }
}

export function useMediaUploadQueue(workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  const [entries, setEntries] = useState<UploadQueueEntry[]>([])
  const controllersRef = useRef(new Map<string, AbortController>())

  const updateItem = useCallback(
    (entryId: string, update: Partial<MediaLibraryItem>) => {
      setEntries((current) =>
        current.map((entry) =>
          entry.item.id === entryId
            ? {
                ...entry,
                item: {
                  ...entry.item,
                  ...update,
                  updatedAt: new Date().toISOString(),
                },
              }
            : entry
        )
      )
    },
    []
  )

  const startUpload = useCallback(
    async (entryId: string, file: File) => {
      if (!workspaceId) {
        updateItem(entryId, {
          status: "FAILED",
          uploadProgress: undefined,
          uploadError: "No workspace is available for this account.",
        })
        return
      }

      const controller = new AbortController()
      controllersRef.current.set(entryId, controller)
      updateItem(entryId, {
        status: "UPLOADING",
        uploadProgress: 0,
        uploadError: undefined,
      })

      try {
        const descriptor = getMediaUploadDescriptor(file)
        const metadata = await readMediaFileMetadata(
          file,
          descriptor.mediaType
        )

        await uploadMediaFile({
          file,
          workspaceId,
          metadata,
          signal: controller.signal,
          onProgress: (progress) =>
            updateItem(entryId, { uploadProgress: progress }),
        })
        setEntries((current) =>
          current.filter((entry) => entry.item.id !== entryId)
        )
        await queryClient.invalidateQueries({
          queryKey: mediaQueryKeys.lists(workspaceId),
        })
        toast.success("Upload complete", { description: file.name })
      } catch (error) {
        const aborted = controller.signal.aborted
        updateItem(entryId, {
          status: "FAILED",
          uploadProgress: undefined,
          uploadError: aborted
            ? "Upload canceled."
            : error instanceof Error
              ? error.message
              : "Upload failed.",
        })
        if (!aborted) {
          toast.error("Upload failed", {
            description:
              error instanceof Error ? error.message : "Please try again.",
          })
        }
      } finally {
        controllersRef.current.delete(entryId)
      }
    },
    [queryClient, updateItem, workspaceId]
  )

  const addFiles = useCallback(
    (files: File[]) => {
      const acceptedEntries: UploadQueueEntry[] = []
      const rejected: Array<{ file: File; message: string }> = []

      files.forEach((file, index) => {
        const entryId = `local-upload-${Date.now()}-${index}-${crypto.randomUUID()}`

        try {
          acceptedEntries.push({
            file,
            item: getLocalUploadItem(file, entryId),
            workspaceId: workspaceId ?? "",
          })
        } catch (error) {
          rejected.push({
            file,
            message:
              error instanceof Error ? error.message : "Unsupported media file.",
          })
        }
      })

      if (acceptedEntries.length > 0) {
        setEntries((current) => [...acceptedEntries, ...current])
        acceptedEntries.forEach((entry) => {
          void startUpload(entry.item.id, entry.file)
        })
      }

      return rejected
    },
    [startUpload, workspaceId]
  )

  const retryUpload = useCallback(
    (entryId: string) => {
      const entry = entries.find((candidate) => candidate.item.id === entryId)
      if (entry) {
        void startUpload(entryId, entry.file)
      }
    },
    [entries, startUpload]
  )

  const cancelUpload = useCallback((entryId: string) => {
    controllersRef.current.get(entryId)?.abort()
  }, [])

  const dismissUpload = useCallback((entryId: string) => {
    controllersRef.current.get(entryId)?.abort()
    controllersRef.current.delete(entryId)
    setEntries((current) =>
      current.filter((entry) => entry.item.id !== entryId)
    )
  }, [])

  useEffect(
    () => () => {
      controllersRef.current.forEach((controller) => controller.abort())
      controllersRef.current.clear()
    },
    []
  )

  useEffect(() => {
    controllersRef.current.forEach((controller) => controller.abort())
    controllersRef.current.clear()
  }, [workspaceId])

  return {
    items: entries
      .filter((entry) => entry.workspaceId === workspaceId)
      .map((entry) => entry.item),
    addFiles,
    retryUpload,
    cancelUpload,
    dismissUpload,
  }
}
