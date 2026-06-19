import {
  publicApiClient,
  unwrapApiResponse,
} from "@/lib/api/api-client"
import type { ApiSuccess } from "@/lib/api/api.types"
import type { LoginInput, RegisterInput } from "../auth.schema"
import type {
  AuthResponseData,
  CurrentUserResponseData,
  MessageResponseData,
} from "../auth.types"
import { authenticatedApiClient } from "./authenticated-api-client"
import { refreshAccessToken } from "./auth-refresh.service"

export const authService = {
  login(input: LoginInput): Promise<AuthResponseData> {
    return unwrapApiResponse(
      publicApiClient.post<ApiSuccess<AuthResponseData>>("/auth/login", input)
    )
  },

  register(input: RegisterInput): Promise<AuthResponseData> {
    return unwrapApiResponse(
      publicApiClient.post<ApiSuccess<AuthResponseData>>(
        "/auth/register",
        input
      )
    )
  },

  refreshAccessToken,

  getCurrentUser(): Promise<CurrentUserResponseData> {
    return unwrapApiResponse(
      authenticatedApiClient.get<ApiSuccess<CurrentUserResponseData>>(
        "/auth/me"
      )
    )
  },

  logout(): Promise<MessageResponseData> {
    return unwrapApiResponse(
      publicApiClient.post<ApiSuccess<MessageResponseData>>("/auth/logout")
    )
  },

  logoutAll(): Promise<MessageResponseData> {
    return unwrapApiResponse(
      authenticatedApiClient.post<ApiSuccess<MessageResponseData>>(
        "/auth/logout-all"
      )
    )
  },
}
