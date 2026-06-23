import axios from "axios"
import MockAdapter from "axios-mock-adapter"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { mediaService, uploadMediaFile } from "./media.service"

const apiMock = new MockAdapter(authenticatedApiClient)
const storageMock = new MockAdapter(axios)
const workspaceId = "123e4567-e89b-12d3-a456-426614174000"
const mediaId = "123e4567-e89b-12d3-a456-426614174001"
const now = "2026-06-19T10:00:00.000Z"

const media = {
  id: mediaId,
  workspaceId,
  type: "VIDEO",
  title: "Upload",
  description: null,
  originalFilename: "upload.mp4",
  duration: null,
  fileSizeBytes: "8",
  mimeType: "video/mp4",
  width: null,
  height: null,
  metadata: null,
  status: "UPLOADED",
  createdAt: now,
  updatedAt: now,
}

describe("media service", () => {
  beforeEach(() => {
    apiMock.reset()
    storageMock.reset()
  })

  afterAll(() => {
    apiMock.restore()
    storageMock.restore()
  })

  it("passes list pagination, status, and sort parameters to the media API", async () => {
    apiMock.onGet(`/workspaces/${workspaceId}/media`).reply((config) => {
      expect(config.params).toEqual({
        page: 1,
        limit: 50,
        status: "UPLOADED",
        sortBy: "createdAt",
        sortOrder: "desc",
      })

      return [
        200,
        {
          success: true,
          data: {
            items: [media],
            meta: {
              total: 1,
              page: 1,
              limit: 50,
              totalPages: 1,
            },
          },
        },
      ]
    })

    await expect(
      mediaService.list(workspaceId, {
        page: 1,
        limit: 50,
        status: "UPLOADED",
        sortBy: "createdAt",
        sortOrder: "desc",
      })
    ).resolves.toMatchObject({
      items: [media],
      meta: { total: 1 },
    })
  })

  it("uses separate preview and attachment download endpoints", async () => {
    apiMock.onGet(`/workspaces/${workspaceId}/media/${mediaId}/preview-url`).reply(200, {
      success: true,
      data: { url: "https://storage.example.com/preview", expiresInSeconds: 900 },
    })
    apiMock.onGet(`/workspaces/${workspaceId}/media/${mediaId}/download-url`).reply(200, {
      success: true,
      data: { url: "https://storage.example.com/download", expiresInSeconds: 900 },
    })

    await expect(mediaService.getPreviewUrl(workspaceId, mediaId)).resolves.toMatchObject({
      url: "https://storage.example.com/preview",
    })
    await expect(mediaService.getDownloadUrl(workspaceId, mediaId)).resolves.toMatchObject({
      url: "https://storage.example.com/download",
    })
  })

  it("uploads and completes a single-part file", async () => {
    const file = new File([new Uint8Array(8)], "upload.mp4", {
      type: "video/mp4",
    })
    const progress: number[] = []

    apiMock.onPost(`/workspaces/${workspaceId}/media/upload-url`).reply(201, {
      success: true,
      data: {
        mode: "SINGLE",
        mediaId,
        url: "https://storage.example.com/single",
        headers: { "Content-Type": "video/mp4" },
        expiresInSeconds: 900,
      },
    })
    storageMock.onPut("https://storage.example.com/single").reply(200)
    apiMock.onPost(`/workspaces/${workspaceId}/media/${mediaId}/complete-upload`).reply(200, {
      success: true,
      data: { media },
    })

    await expect(
      uploadMediaFile({
        file,
        workspaceId,
        onProgress: (value) => progress.push(value),
      })
    ).resolves.toEqual(media)

    expect(JSON.parse(apiMock.history.post[0].data)).toEqual({
      mediaType: "VIDEO",
      originalFilename: "upload.mp4",
      mimeType: "video/mp4",
      fileSizeBytes: 8,
    })
    expect(progress.at(-1)).toBe(100)
  })

  it("uploads multipart slices and completes with sorted ETags", async () => {
    const file = new File([new Uint8Array(10)], "upload.mp4", {
      type: "video/mp4",
    })

    apiMock.onPost(`/workspaces/${workspaceId}/media/upload-url`).reply(201, {
      success: true,
      data: {
        mode: "MULTIPART",
        mediaId,
        partSizeBytes: 4,
        parts: [
          { partNumber: 1, url: "https://storage.example.com/part-1" },
          { partNumber: 2, url: "https://storage.example.com/part-2" },
          { partNumber: 3, url: "https://storage.example.com/part-3" },
        ],
        expiresInSeconds: 900,
      },
    })
    storageMock
      .onPut("https://storage.example.com/part-1")
      .reply(200, undefined, { ETag: '"etag-1"' })
    storageMock
      .onPut("https://storage.example.com/part-2")
      .reply(200, undefined, { ETag: '"etag-2"' })
    storageMock
      .onPut("https://storage.example.com/part-3")
      .reply(200, undefined, { ETag: '"etag-3"' })
    apiMock.onPost(`/workspaces/${workspaceId}/media/${mediaId}/complete-upload`).reply((config) => {
      expect(JSON.parse(config.data)).toEqual({
        duration: 120.5,
        width: 1920,
        height: 1080,
        parts: [
          { partNumber: 1, etag: '"etag-1"' },
          { partNumber: 2, etag: '"etag-2"' },
          { partNumber: 3, etag: '"etag-3"' },
        ],
      })
      return [200, { success: true, data: { media } }]
    })

    await expect(
      uploadMediaFile({
        file,
        workspaceId,
        metadata: {
          duration: 120.5,
          width: 1920,
          height: 1080,
        },
      })
    ).resolves.toEqual(media)
    expect(storageMock.history.put).toHaveLength(3)
  })

  it("aborts the backend upload session after storage failure", async () => {
    const file = new File([new Uint8Array(8)], "upload.mp4", {
      type: "video/mp4",
    })

    apiMock.onPost(`/workspaces/${workspaceId}/media/upload-url`).reply(201, {
      success: true,
      data: {
        mode: "SINGLE",
        mediaId,
        url: "https://storage.example.com/failure",
        headers: { "Content-Type": "video/mp4" },
        expiresInSeconds: 900,
      },
    })
    storageMock.onPut("https://storage.example.com/failure").reply(500)
    apiMock.onPost(`/workspaces/${workspaceId}/media/${mediaId}/abort-upload`).reply(200, {
      success: true,
      data: { message: "Media upload aborted successfully" },
    })

    await expect(uploadMediaFile({ file, workspaceId })).rejects.toThrow()
    expect(
      apiMock.history.post.some((request) =>
        request.url?.endsWith(`/${mediaId}/abort-upload`)
      )
    ).toBe(true)
  })
})
