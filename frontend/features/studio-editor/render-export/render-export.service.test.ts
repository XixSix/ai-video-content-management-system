import MockAdapter from "axios-mock-adapter"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"

import {
  getRenderExportAssetId,
  renderExportService,
} from "./render-export.service"
import type { RenderExportJob } from "./render-export.schema"

const apiMock = new MockAdapter(authenticatedApiClient)
const workspaceId = "123e4567-e89b-12d3-a456-426614174000"
const projectId = "123e4567-e89b-12d3-a456-426614174001"
const jobId = "123e4567-e89b-12d3-a456-426614174002"
const mediaId = "123e4567-e89b-12d3-a456-426614174003"
const assetId = "123e4567-e89b-12d3-a456-426614174004"

const job = (overrides: Partial<RenderExportJob> = {}): RenderExportJob => ({
  id: jobId,
  mediaId,
  jobType: "EXPORT_RENDER",
  status: "PENDING",
  progress: 0,
  errorMessage: null,
  output: null,
  attemptCount: 0,
  createdAt: "2026-06-24T01:00:00.000Z",
  updatedAt: "2026-06-24T01:00:00.000Z",
  startedAt: null,
  completedAt: null,
  ...overrides,
})

describe("render export service", () => {
  beforeEach(() => apiMock.reset())
  afterAll(() => apiMock.restore())

  it("creates render jobs at the workspace-scoped project endpoint", async () => {
    apiMock
      .onPost(`/workspaces/${workspaceId}/projects/${projectId}/export-render`)
      .reply(201, {
        success: true,
        data: { job: job({ status: "QUEUED" }) },
      })

    await expect(
      renderExportService.create(workspaceId, projectId)
    ).resolves.toEqual({ job: job({ status: "QUEUED" }) })
  })

  it("reads render job status", async () => {
    apiMock.onGet(`/jobs/${jobId}`).reply(200, {
      success: true,
      data: { job: job({ status: "RUNNING", progress: 42 }) },
    })

    await expect(renderExportService.getJob(jobId)).resolves.toEqual({
      job: job({ status: "RUNNING", progress: 42 }),
    })
  })

  it("reads generated asset download URLs", async () => {
    apiMock.onGet(`/assets/${assetId}/download-url`).reply(200, {
      success: true,
      data: { url: "https://cdn.example.test/export.mp4", expiresInSeconds: 900 },
    })

    await expect(renderExportService.getAssetDownloadUrl(assetId)).resolves.toEqual({
      url: "https://cdn.example.test/export.mp4",
      expiresInSeconds: 900,
    })
  })

  it("extracts completed output asset ids from supported backend shapes", () => {
    expect(
      getRenderExportAssetId(
        job({
          status: "COMPLETED",
          output: { summary: { assetId } },
        })
      )
    ).toBe(assetId)

    expect(
      getRenderExportAssetId(
        job({
          status: "COMPLETED",
          output: { asset: { id: assetId } },
        })
      )
    ).toBe(assetId)
  })
})
