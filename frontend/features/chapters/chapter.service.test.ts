import MockAdapter from "axios-mock-adapter"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { chapterService } from "./chapter.service"

const apiMock = new MockAdapter(authenticatedApiClient)
const mediaId = "123e4567-e89b-12d3-a456-426614174001"

describe("chapter service", () => {
  beforeEach(() => apiMock.reset())
  afterAll(() => apiMock.restore())

  it("loads chapters for a media item", async () => {
    apiMock.onGet(`/media/${mediaId}/chapters`).reply(200, {
      success: true,
      data: { chapters: [{ id: "chapter-id", mediaId, title: "Intro" }] },
    })

    await expect(chapterService.listByMedia(mediaId)).resolves.toMatchObject({
      chapters: [{ id: "chapter-id", title: "Intro" }],
    })
  })
})
