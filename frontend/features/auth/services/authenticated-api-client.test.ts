import MockAdapter from "axios-mock-adapter"
import {
  AxiosHeaders,
  type AxiosRequestConfig,
} from "axios"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import {
  publicApiClient,
  unwrapApiResponse,
} from "@/lib/api/api-client"
import type { ApiSuccess } from "@/lib/api/api.types"
import { useAuthStore } from "../store/auth.store"
import { authenticatedApiClient } from "./authenticated-api-client"

const publicMock = new MockAdapter(publicApiClient)
const authenticatedMock = new MockAdapter(authenticatedApiClient)

const getAuthorizationHeader = (
  headers: AxiosRequestConfig["headers"]
): unknown => {
  if (headers instanceof AxiosHeaders) {
    return headers.get("Authorization")
  }

  return headers?.Authorization
}

const successResponse = (value: string) => ({
  success: true,
  data: { value },
})

const unauthorizedResponse = {
  success: false,
  error: {
    code: "UNAUTHORIZED",
    message: "Invalid access token",
  },
}

describe("authenticated API client", () => {
  beforeEach(() => {
    publicMock.reset()
    authenticatedMock.reset()
    useAuthStore.setState({
      status: "authenticated",
      accessToken: "expired-access-token",
    })
  })

  afterAll(() => {
    publicMock.restore()
    authenticatedMock.restore()
  })

  it("adds the current access token to protected requests", async () => {
    authenticatedMock.onGet("/protected").reply((config) => {
      expect(getAuthorizationHeader(config.headers)).toBe(
        "Bearer expired-access-token"
      )
      return [200, successResponse("ok")]
    })

    await expect(
      unwrapApiResponse(
        authenticatedApiClient.get<ApiSuccess<{ value: string }>>("/protected")
      )
    ).resolves.toEqual({ value: "ok" })
  })

  it("refreshes once and retries a 401 request with the new token", async () => {
    authenticatedMock
      .onGet("/protected")
      .replyOnce(401, unauthorizedResponse)
      .onGet("/protected")
      .reply((config) => {
        expect(getAuthorizationHeader(config.headers)).toBe(
          "Bearer refreshed-access-token"
        )
        return [200, successResponse("retried")]
      })
    publicMock.onPost("/auth/refresh").reply(200, {
      success: true,
      data: { accessToken: "refreshed-access-token" },
    })

    await expect(
      unwrapApiResponse(
        authenticatedApiClient.get<ApiSuccess<{ value: string }>>("/protected")
      )
    ).resolves.toEqual({ value: "retried" })
    expect(publicMock.history.post).toHaveLength(1)
    expect(useAuthStore.getState().accessToken).toBe("refreshed-access-token")
  })

  it("deduplicates refresh for concurrent 401 responses", async () => {
    let protectedRequestCount = 0

    authenticatedMock.onGet("/protected").reply(() => {
      protectedRequestCount += 1

      if (protectedRequestCount <= 2) {
        return [401, unauthorizedResponse]
      }

      return [200, successResponse("retried")]
    })
    publicMock.onPost("/auth/refresh").reply(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))

      return [
        200,
        {
          success: true,
          data: { accessToken: "refreshed-access-token" },
        },
      ]
    })

    const requests = [
      unwrapApiResponse(
        authenticatedApiClient.get<ApiSuccess<{ value: string }>>("/protected")
      ),
      unwrapApiResponse(
        authenticatedApiClient.get<ApiSuccess<{ value: string }>>("/protected")
      ),
    ]

    await expect(Promise.all(requests)).resolves.toEqual([
      { value: "retried" },
      { value: "retried" },
    ])
    expect(publicMock.history.post).toHaveLength(1)
  })

  it("clears the local session when refresh fails", async () => {
    authenticatedMock.onGet("/protected").reply(401, unauthorizedResponse)
    publicMock.onPost("/auth/refresh").reply(401, {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid refresh token",
      },
    })

    await expect(
      unwrapApiResponse(
        authenticatedApiClient.get<ApiSuccess<{ value: string }>>("/protected")
      )
    ).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
    })
    expect(useAuthStore.getState()).toMatchObject({
      status: "anonymous",
      accessToken: null,
    })
  })

  it.each([
    [403, "FORBIDDEN"],
    [500, "INTERNAL_SERVER_ERROR"],
  ])(
    "keeps the session when the retried request fails with %s",
    async (status, code) => {
      authenticatedMock
        .onGet("/protected")
        .replyOnce(401, unauthorizedResponse)
        .onGet("/protected")
        .reply(status, {
          success: false,
          error: {
            code,
            message: "Request failed",
          },
        })
      publicMock.onPost("/auth/refresh").reply(200, {
        success: true,
        data: { accessToken: "refreshed-access-token" },
      })

      await expect(
        unwrapApiResponse(
          authenticatedApiClient.get<ApiSuccess<{ value: string }>>(
            "/protected"
          )
        )
      ).rejects.toMatchObject({
        status,
        code,
      })
      expect(useAuthStore.getState()).toMatchObject({
        status: "authenticated",
        accessToken: "refreshed-access-token",
      })
    }
  )
})
