import MockAdapter from "axios-mock-adapter"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"

import { publishingService, type PublishTaskResponseData } from "./publishing.service"

const apiMock = new MockAdapter(authenticatedApiClient)
const publishTaskId = "123e4567-e89b-12d3-a456-426614174001"
const jobId = "123e4567-e89b-12d3-a456-426614174002"
const mediaId = "123e4567-e89b-12d3-a456-426614174003"
const platformAccountId = "123e4567-e89b-12d3-a456-426614174004"

const publishTask = (
  overrides: Partial<PublishTaskResponseData> = {}
): PublishTaskResponseData => ({
  id: publishTaskId,
  userId: "123e4567-e89b-12d3-a456-426614174000",
  mediaId,
  projectId: null,
  shortClipId: null,
  platformAccountId,
  jobId: null,
  platform: "YOUTUBE",
  title: "Launch video",
  caption: "Caption",
  description: null,
  hashtags: ["#launch"],
  status: "DRAFT",
  scheduledAt: null,
  publishedAt: null,
  platformPostId: null,
  platformPostUrl: null,
  errorCode: null,
  errorMessage: null,
  createdAt: "2026-06-26T00:00:00.000Z",
  updatedAt: "2026-06-26T00:00:00.000Z",
  source: {
    type: "MEDIA",
    id: mediaId,
    title: "Launch source",
    thumbnailUrl: null,
    duration: 90,
    aspectRatio: "16:9",
    mediaType: "VIDEO",
  },
  platformAccount: {
    id: platformAccountId,
    platform: "YOUTUBE",
    accountName: "VidPilot",
    avatarUrl: null,
    status: "CONNECTED",
  },
  ...overrides,
})

const job = {
  id: jobId,
  mediaId,
  jobType: "PUBLISH",
  status: "PUBLISHING",
  progress: 70,
  errorCode: null,
  errorMessage: null,
  output: null,
  attemptCount: 0,
  createdAt: "2026-06-26T00:00:00.000Z",
  updatedAt: "2026-06-26T00:00:00.000Z",
  startedAt: "2026-06-26T00:00:00.000Z",
  completedAt: null,
}

describe("publishingService", () => {
  beforeEach(() => apiMock.reset())
  afterAll(() => apiMock.restore())

  it("lists publish tasks with query filters", async () => {
    apiMock.onGet("/publish-tasks").reply((config) => {
      expect(config.params).toMatchObject({
        page: 1,
        platform: "YOUTUBE",
        search: "launch",
      })

      return [
        200,
        {
          success: true,
          data: {
            items: [publishTask()],
            meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
          },
        },
      ]
    })

    await expect(
      publishingService.list({
        page: 1,
        platform: "YOUTUBE",
        search: "launch",
      })
    ).resolves.toEqual({
      items: [publishTask()],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    })
  })

  it("creates publish tasks", async () => {
    apiMock
      .onPost("/publish-tasks", {
        mediaId,
        platform: "YOUTUBE",
        platformAccountId,
        title: "Launch video",
      })
      .reply(201, {
        success: true,
        data: { publishTask: publishTask() },
      })

    await expect(
      publishingService.create({
        mediaId,
        platform: "YOUTUBE",
        platformAccountId,
        title: "Launch video",
      })
    ).resolves.toEqual({ publishTask: publishTask() })
  })

  it("starts publish, schedule, and cancel actions", async () => {
    apiMock.onPost(`/publish-tasks/${publishTaskId}/publish`).reply(200, {
      success: true,
      data: {
        publishTask: publishTask({ jobId, status: "PUBLISHING" }),
        job,
      },
    })
    apiMock
      .onPost(`/publish-tasks/${publishTaskId}/schedule`, {
        scheduledAt: "2026-06-27T09:00:00.000Z",
      })
      .reply(200, {
        success: true,
        data: {
          publishTask: publishTask({ jobId, status: "SCHEDULED" }),
          job: { ...job, status: "PENDING" },
        },
      })
    apiMock.onPost(`/publish-tasks/${publishTaskId}/cancel`).reply(200, {
      success: true,
      data: { publishTask: publishTask({ status: "CANCELED" }) },
    })

    await expect(publishingService.publish(publishTaskId)).resolves.toEqual({
      publishTask: publishTask({ jobId, status: "PUBLISHING" }),
      job,
    })
    await expect(
      publishingService.schedule(publishTaskId, "2026-06-27T09:00:00.000Z")
    ).resolves.toEqual({
      publishTask: publishTask({ jobId, status: "SCHEDULED" }),
      job: { ...job, status: "PENDING" },
    })
    await expect(publishingService.cancel(publishTaskId)).resolves.toEqual({
      publishTask: publishTask({ status: "CANCELED" }),
    })
  })
})
