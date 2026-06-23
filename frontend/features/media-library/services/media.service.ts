import axios from "axios"

import {
  unwrapApiResponse,
} from "@/lib/api/api-client"
import type { ApiSuccess } from "@/lib/api/api.types"
import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import type {
  CompletedUploadPart,
  CompleteUploadInput,
  CreateUploadUrlInput,
  CreateUploadUrlResult,
  MediaDetailResponseData,
  MediaApiType,
  MediaListQuery,
  MediaListResponseData,
  MediaResponseData,
  MediaUploadOptions,
} from "../media-library.types"

const MULTIPART_CONCURRENCY = 3

function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".")
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : ""
}

export function getMediaUploadDescriptor(file: File): {
  mediaType: MediaApiType
  mimeType: string
} {
  const extension = getFileExtension(file.name)

  if (
    [".mp4", ".webm", ".mov"].includes(extension) &&
    (file.type.startsWith("video/") || !file.type)
  ) {
    const defaultMimeTypes: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
    }
    return {
      mediaType: "VIDEO",
      mimeType: file.type || defaultMimeTypes[extension],
    }
  }

  if (
    [".mp3", ".mp4", ".m4a", ".wav", ".webm", ".ogg", ".flac"].includes(extension) &&
    (file.type.startsWith("audio/") || !file.type)
  ) {
    const defaultMimeTypes: Record<string, string> = {
      ".mp3": "audio/mpeg",
      ".mp4": "audio/mp4",
      ".m4a": "audio/x-m4a",
      ".wav": "audio/wav",
      ".webm": "audio/webm",
      ".ogg": "audio/ogg",
      ".flac": "audio/flac",
    }
    return {
      mediaType: "AUDIO",
      mimeType: file.type || defaultMimeTypes[extension],
    }
  }

  if (
    [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension) &&
    (file.type.startsWith("image/") || !file.type)
  ) {
    const defaultMimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
    }
    return {
      mediaType: "IMAGE",
      mimeType: file.type || defaultMimeTypes[extension],
    }
  }

  if (extension === ".srt") {
    return {
      mediaType: "SUBTITLE",
      mimeType: file.type || "application/x-subrip",
    }
  }

  if (extension === ".vtt") {
    return {
      mediaType: "SUBTITLE",
      mimeType: file.type || "text/vtt",
    }
  }

  throw new Error(`Unsupported media file: ${file.name}`)
}

export const mediaService = {
  list(
    workspaceId: string,
    query: MediaListQuery
  ): Promise<MediaListResponseData> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<MediaListResponseData>>(
        `/workspaces/${workspaceId}/media`,
        { params: query }
      )
    )
  },

  get(
    workspaceId: string,
    mediaId: string
  ): Promise<{ media: MediaDetailResponseData }> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<{ media: MediaDetailResponseData }>>(
        `/workspaces/${workspaceId}/media/${mediaId}`
      )
    )
  },

  update(
    workspaceId: string,
    mediaId: string,
    input: { title?: string | null; description?: string | null }
  ): Promise<{ media: MediaResponseData }> {
    return unwrapApiResponse(
      authenticatedApiClient.patch<ApiSuccess<{ media: MediaResponseData }>>(
        `/workspaces/${workspaceId}/media/${mediaId}`,
        input
      )
    )
  },

  remove(workspaceId: string, mediaId: string): Promise<{ message: string }> {
    return unwrapApiResponse(
      authenticatedApiClient.delete<ApiSuccess<{ message: string }>>(
        `/workspaces/${workspaceId}/media/${mediaId}`
      )
    )
  },

  getDownloadUrl(
    workspaceId: string,
    mediaId: string
  ): Promise<{ url: string; expiresInSeconds: number }> {
    return unwrapApiResponse(
      authenticatedApiClient.get<
        ApiSuccess<{ url: string; expiresInSeconds: number }>
      >(`/workspaces/${workspaceId}/media/${mediaId}/download-url`)
    )
  },

  getPreviewUrl(
    workspaceId: string,
    mediaId: string
  ): Promise<{ url: string; expiresInSeconds: number }> {
    return unwrapApiResponse(
      authenticatedApiClient.get<
        ApiSuccess<{ url: string; expiresInSeconds: number }>
      >(`/workspaces/${workspaceId}/media/${mediaId}/preview-url`)
    )
  },

  createUploadUrl(
    workspaceId: string,
    input: CreateUploadUrlInput
  ): Promise<CreateUploadUrlResult> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<CreateUploadUrlResult>>(
        `/workspaces/${workspaceId}/media/upload-url`,
        input
      )
    )
  },

  completeUpload(
    workspaceId: string,
    mediaId: string,
    input: CompleteUploadInput = {}
  ): Promise<{ media: MediaResponseData }> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<{ media: MediaResponseData }>>(
        `/workspaces/${workspaceId}/media/${mediaId}/complete-upload`,
        input
      )
    )
  },

  abortUpload(
    workspaceId: string,
    mediaId: string
  ): Promise<{ message: string }> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<{ message: string }>>(
        `/workspaces/${workspaceId}/media/${mediaId}/abort-upload`
      )
    )
  },
}

async function uploadSingle(
  file: File,
  session: Extract<CreateUploadUrlResult, { mode: "SINGLE" }>,
  signal: AbortSignal | undefined,
  onProgress: ((progress: number) => void) | undefined
): Promise<void> {
  await axios.put(session.url, file, {
    headers: session.headers,
    signal,
    onUploadProgress: (event) => {
      if (event.total) {
        onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)))
      }
    },
  })
}

async function uploadMultipart(
  file: File,
  session: Extract<CreateUploadUrlResult, { mode: "MULTIPART" }>,
  signal: AbortSignal | undefined,
  onProgress: ((progress: number) => void) | undefined
): Promise<CompletedUploadPart[]> {
  const uploadedBytes = new Map<number, number>()
  const results: CompletedUploadPart[] = []
  let nextPartIndex = 0

  const reportProgress = () => {
    const loaded = Array.from(uploadedBytes.values()).reduce(
      (total, value) => total + value,
      0
    )
    onProgress?.(Math.min(99, Math.round((loaded / file.size) * 100)))
  }

  const worker = async () => {
    while (nextPartIndex < session.parts.length) {
      const partIndex = nextPartIndex
      nextPartIndex += 1
      const part = session.parts[partIndex]
      const start = (part.partNumber - 1) * session.partSizeBytes
      const end = Math.min(start + session.partSizeBytes, file.size)
      const blob = file.slice(start, end)
      const response = await axios.put(part.url, blob, {
        signal,
        onUploadProgress: (event) => {
          uploadedBytes.set(part.partNumber, event.loaded)
          reportProgress()
        },
      })
      const etag =
        typeof response.headers.get === "function"
          ? response.headers.get("etag")
          : response.headers.etag

      if (typeof etag !== "string" || !etag.trim()) {
        throw new Error(`Storage did not expose an ETag for part ${part.partNumber}`)
      }

      uploadedBytes.set(part.partNumber, blob.size)
      reportProgress()
      results.push({
        partNumber: part.partNumber,
        etag,
      })
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(MULTIPART_CONCURRENCY, session.parts.length) },
      () => worker()
    )
  )

  return results.sort((left, right) => left.partNumber - right.partNumber)
}

export async function uploadMediaFile({
  file,
  workspaceId,
  metadata,
  signal,
  onProgress,
}: MediaUploadOptions): Promise<MediaResponseData> {
  const descriptor = getMediaUploadDescriptor(file)
  let mediaId: string | null = null

  try {
    const session = await mediaService.createUploadUrl(workspaceId, {
      mediaType: descriptor.mediaType,
      originalFilename: file.name,
      mimeType: descriptor.mimeType,
      fileSizeBytes: file.size,
    })
    mediaId = session.mediaId
    onProgress?.(1)

    if (session.mode === "SINGLE") {
      await uploadSingle(file, session, signal, onProgress)
      const { media } = await mediaService.completeUpload(
        workspaceId,
        session.mediaId,
        metadata
      )
      onProgress?.(100)
      return media
    }

    const parts = await uploadMultipart(
      file,
      session,
      signal,
      onProgress
    )
    const { media } = await mediaService.completeUpload(
      workspaceId,
      session.mediaId,
      {
        ...metadata,
        parts,
      }
    )
    onProgress?.(100)
    return media
  } catch (error) {
    if (mediaId) {
      await mediaService
        .abortUpload(workspaceId, mediaId)
        .catch(() => undefined)
    }
    throw error
  }
}
