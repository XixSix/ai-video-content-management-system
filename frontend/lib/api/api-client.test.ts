import MockAdapter from "axios-mock-adapter"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import {
  publicApiClient,
  unwrapApiResponse,
} from "./api-client"
import type { ApiSuccess } from "./api.types"

const mock = new MockAdapter(publicApiClient)

describe("API client", () => {
  beforeEach(() => {
    mock.reset()
  })

  afterAll(() => {
    mock.restore()
  })

  it("uses credentials and unwraps successful response data", async () => {
    mock.onGet("/example").reply(200, {
      success: true,
      data: { value: "ok" },
    })

    await expect(
      unwrapApiResponse(
        publicApiClient.get<ApiSuccess<{ value: string }>>("/example")
      )
    ).resolves.toEqual({ value: "ok" })
    expect(publicApiClient.defaults.withCredentials).toBe(true)
  })

  it("maps backend error envelopes to ApiError", async () => {
    mock.onPost("/example").reply(400, {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: [
          {
            path: "email",
            message: "Invalid email address",
            code: "invalid_format",
          },
        ],
      },
    })

    const request = unwrapApiResponse(
      publicApiClient.post<ApiSuccess<never>>("/example")
    )

    await expect(request).rejects.toEqual(
      expect.objectContaining({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: [
          {
            path: "email",
            message: "Invalid email address",
            code: "invalid_format",
          },
        ],
      })
    )
  })

  it("rejects malformed successful responses", async () => {
    mock.onGet("/malformed").reply(200, { data: { value: "missing-success" } })

    await expect(
      unwrapApiResponse(
        publicApiClient.get<ApiSuccess<{ value: string }>>("/malformed")
      )
    ).rejects.toMatchObject({
      status: 200,
      code: "INVALID_API_RESPONSE",
    })
  })
})
