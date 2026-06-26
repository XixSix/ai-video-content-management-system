import MockAdapter from "axios-mock-adapter"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { shortClipsService } from "./short-clips.service"

const apiMock = new MockAdapter(authenticatedApiClient)
const mediaId = "123e4567-e89b-12d3-a456-426614174001"
const shortClipId = "123e4567-e89b-12d3-a456-426614174002"

describe("short clips service", () => {
  beforeEach(() => apiMock.reset())
  afterAll(() => apiMock.restore())

  it("starts generation with an empty body", async () => {
    apiMock.onPost(`/media/${mediaId}/short-clips/generate`, {}).reply(201, {
      success: true,
      data: { job: { id: "job-id" } },
    })

    await expect(shortClipsService.generate(mediaId)).resolves.toEqual({
      job: { id: "job-id" },
    })
  })

  it("lists candidates, clips, and download urls", async () => {
    apiMock.onGet(`/media/${mediaId}/clip-candidates`).reply((config) => {
      expect(config.params).toEqual({ page: 1, limit: 10 })

      return [
        200,
        {
          success: true,
          data: { items: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } },
        },
      ]
    })
    apiMock.onGet(`/media/${mediaId}/short-clips`).reply(200, {
      success: true,
      data: { items: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } },
    })
    apiMock.onGet(`/short-clips/${shortClipId}/download-url`).reply(200, {
      success: true,
      data: { url: "https://storage.example.com/clip.mp4", expiresInSeconds: 900 },
    })

    await expect(
      shortClipsService.listCandidates(mediaId, { page: 1, limit: 10 })
    ).resolves.toMatchObject({ items: [] })
    await expect(
      shortClipsService.listShortClips(mediaId, { page: 1, limit: 10 })
    ).resolves.toMatchObject({ items: [] })
    await expect(shortClipsService.getDownloadUrl(shortClipId)).resolves.toEqual({
      url: "https://storage.example.com/clip.mp4",
      expiresInSeconds: 900,
    })
  })
})
