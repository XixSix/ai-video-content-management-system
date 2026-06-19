import axios, {
  type AxiosInstance,
  type AxiosResponse,
} from "axios"

import { ApiError, toApiError } from "./api-error"
import type { ApiSuccess } from "./api.types"

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1"
).replace(/\/$/, "")

export function createApiClient(): AxiosInstance {
  return axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
  })
}

export function attachApiErrorInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(toApiError(error))
  )
}

export async function unwrapApiResponse<TData>(
  request: Promise<AxiosResponse<ApiSuccess<TData>>>
): Promise<TData> {
  const response = await request

  if (response.data?.success !== true) {
    throw new ApiError(
      "Invalid API response",
      response.status,
      "INVALID_API_RESPONSE"
    )
  }

  return response.data.data
}

export const publicApiClient = createApiClient()

attachApiErrorInterceptor(publicApiClient)
