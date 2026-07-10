import MockAdapter from "axios-mock-adapter"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { jobService } from "./job.service"

const apiMock = new MockAdapter(authenticatedApiClient)
const jobId = "123e4567-e89b-12d3-a456-426614174001"
const job = {
  id: jobId,
  mediaId: "123e4567-e89b-12d3-a456-426614174002",
  jobType: "TRANSCRIBE",
  status: "COMPLETED",
  progress: 100,
  errorCode: null,
  errorMessage: null,
  output: null,
  attemptCount: 0,
  createdAt: "2026-06-26T10:00:00.000Z",
  updatedAt: "2026-06-26T10:01:00.000Z",
  startedAt: null,
  completedAt: "2026-06-26T10:01:00.000Z",
}

describe("job service", () => {
  beforeEach(() => apiMock.reset())
  afterAll(() => apiMock.restore())

  it("lists recent jobs with filters", async () => {
    apiMock.onGet("/jobs").reply((config) => {
      expect(config.params).toEqual({
        page: 1,
        limit: 8,
        status: "COMPLETED",
        jobType: "TRANSCRIBE",
      })

      return [
        200,
        {
          success: true,
          data: {
            items: [job],
            meta: { total: 1, page: 1, limit: 8, totalPages: 1 },
          },
        },
      ]
    })

    await expect(
      jobService.list({
        page: 1,
        limit: 8,
        status: "COMPLETED",
        jobType: "TRANSCRIBE",
      })
    ).resolves.toMatchObject({ items: [job] })
  })
})
