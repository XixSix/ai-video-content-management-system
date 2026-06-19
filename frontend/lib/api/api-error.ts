import axios from "axios"

import type { ApiErrorDetail, ApiFailure } from "./api.types"

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: ApiErrorDetail[]

  constructor(
    message: string,
    status: number,
    code: string,
    details?: ApiErrorDetail[]
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (axios.isAxiosError<ApiFailure>(error)) {
    const payload = error.response?.data

    if (payload?.success === false) {
      return new ApiError(
        payload.error.message,
        error.response?.status ?? 0,
        payload.error.code,
        payload.error.details
      )
    }

    return new ApiError(
      error.message || "Unable to complete the request",
      error.response?.status ?? 0,
      error.code ?? "REQUEST_FAILED"
    )
  }

  return new ApiError(
    error instanceof Error ? error.message : "Unable to complete the request",
    0,
    "REQUEST_FAILED"
  )
}
