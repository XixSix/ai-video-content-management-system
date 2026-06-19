import MockAdapter from "axios-mock-adapter"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { publicApiClient } from "@/lib/api/api-client"
import { authService } from "./auth.service"
import { authenticatedApiClient } from "./authenticated-api-client"

const publicMock = new MockAdapter(publicApiClient)
const authenticatedMock = new MockAdapter(authenticatedApiClient)
const credentials = {
  email: "creator@example.com",
  password: "Password1",
}
const user = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  email: credentials.email,
  role: "USER",
  status: "ACTIVE",
}

describe("auth service", () => {
  beforeEach(() => {
    publicMock.reset()
    authenticatedMock.reset()
  })

  afterAll(() => {
    publicMock.restore()
    authenticatedMock.restore()
  })

  it("calls register and login with their request DTOs", async () => {
    const response = {
      success: true,
      data: {
        accessToken: "access-token",
        user,
      },
    }
    publicMock.onPost("/auth/register", credentials).reply(201, response)
    publicMock.onPost("/auth/login", credentials).reply(200, response)

    await expect(authService.register(credentials)).resolves.toEqual(
      response.data
    )
    await expect(authService.login(credentials)).resolves.toEqual(response.data)
  })

  it("calls refresh and current-user endpoints", async () => {
    publicMock.onPost("/auth/refresh").reply(200, {
      success: true,
      data: { accessToken: "access-token" },
    })
    authenticatedMock.onGet("/auth/me").reply(200, {
      success: true,
      data: { user },
    })

    await expect(authService.refreshAccessToken()).resolves.toBe("access-token")
    await expect(authService.getCurrentUser()).resolves.toEqual({ user })
  })

  it("calls logout and logout-all endpoints", async () => {
    publicMock.onPost("/auth/logout").reply(200, {
      success: true,
      data: { message: "Logged out" },
    })
    authenticatedMock.onPost("/auth/logout-all").reply(200, {
      success: true,
      data: { message: "Logged out from all sessions" },
    })

    await expect(authService.logout()).resolves.toEqual({
      message: "Logged out",
    })
    await expect(authService.logoutAll()).resolves.toEqual({
      message: "Logged out from all sessions",
    })
  })
})
