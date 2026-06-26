import MockAdapter from "axios-mock-adapter"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { assetService } from "./asset.service"

const apiMock = new MockAdapter(authenticatedApiClient)
const mediaId = "123e4567-e89b-12d3-a456-426614174001"
const projectId = "123e4567-e89b-12d3-a456-426614174002"

describe("asset service", () => {
  beforeEach(() => apiMock.reset())
  afterAll(() => apiMock.restore())

  it("passes generated asset filters to the API", async () => {
    apiMock.onGet("/assets").reply((config) => {
      expect(config.params).toEqual({
        page: 1,
        limit: 50,
        mediaId,
        projectId,
        sortBy: "createdAt",
        sortOrder: "desc",
      })

      return [
        200,
        {
          success: true,
          data: {
            items: [],
            meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
          },
        },
      ]
    })

    await expect(
      assetService.list({
        page: 1,
        limit: 50,
        mediaId,
        projectId,
        sortBy: "createdAt",
        sortOrder: "desc",
      })
    ).resolves.toMatchObject({ items: [] })
  })
})
