import axios, {
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios"

import {
  attachApiErrorInterceptor,
  createApiClient,
} from "@/lib/api/api-client"
import { refreshAccessToken } from "./auth-refresh.service"
import { useAuthStore } from "../store/auth.store"

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  authRetryAttempted?: boolean
}

export const authenticatedApiClient = createApiClient()

authenticatedApiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken

  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`)
  }

  return config
})

authenticatedApiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error)
    }

    const request = error.config as RetriableRequestConfig | undefined

    if (!request || request.authRetryAttempted) {
      return Promise.reject(error)
    }

    request.authRetryAttempted = true

    try {
      const accessToken = await refreshAccessToken()
      useAuthStore.getState().setAccessToken(accessToken)

      request.headers = AxiosHeaders.from(request.headers)
      request.headers.set("Authorization", `Bearer ${accessToken}`)

      return authenticatedApiClient.request(request)
    } catch (refreshError) {
      useAuthStore.getState().setAnonymous()
      return Promise.reject(refreshError)
    }
  }
)

attachApiErrorInterceptor(authenticatedApiClient)
