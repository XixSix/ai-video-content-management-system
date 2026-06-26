import MockAdapter from "axios-mock-adapter"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { authenticatedApiClient } from "@/features/auth/services/authenticated-api-client"
import { transcriptService } from "./transcript.service"

const apiMock = new MockAdapter(authenticatedApiClient)
const mediaId = "123e4567-e89b-12d3-a456-426614174001"
const transcriptId = "123e4567-e89b-12d3-a456-426614174002"

describe("transcript service", () => {
  beforeEach(() => apiMock.reset())
  afterAll(() => apiMock.restore())

  it("loads media transcripts and editor payloads", async () => {
    apiMock.onGet(`/media/${mediaId}/transcripts`).reply(200, {
      success: true,
      data: { transcripts: [{ id: transcriptId, mediaId, version: 2 }] },
    })
    apiMock.onGet(`/transcripts/${transcriptId}/editor`).reply(200, {
      success: true,
      data: {
        transcript: { id: transcriptId, mediaId, version: 2, isEdited: false, language: "en" },
        segments: [],
        words: [],
        draft: null,
      },
    })

    await expect(transcriptService.listByMedia(mediaId)).resolves.toMatchObject({
      transcripts: [{ id: transcriptId }],
    })
    await expect(transcriptService.getEditor(transcriptId)).resolves.toMatchObject({
      transcript: { id: transcriptId },
    })
  })

  it("keeps draft save behind a service boundary", async () => {
    const draft = {
      id: "draft-id",
      baseTranscriptVersion: 2,
      revision: 1,
      clientSequence: 1,
      blocks: [],
    }
    apiMock.onPatch(`/transcripts/${transcriptId}/editor/draft`).reply((config) => {
      expect(JSON.parse(config.data as string)).toEqual({
        baseTranscriptVersion: 2,
        clientSequence: 1,
        blocks: [],
      })

      return [200, { success: true, data: { draft } }]
    })

    await expect(
      transcriptService.saveEditorDraft(transcriptId, {
        baseTranscriptVersion: 2,
        clientSequence: 1,
        blocks: [],
      })
    ).resolves.toEqual({ draft })
  })
})
