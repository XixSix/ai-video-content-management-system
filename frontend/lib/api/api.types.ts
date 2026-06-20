export type ApiErrorDetail = {
  path?: string
  message?: string
  code?: string
}

export type ApiErrorDetails =
  | ApiErrorDetail[]
  | Record<string, unknown>

export type ApiSuccess<TData> = {
  success: true
  data: TData
}

export type ApiFailure = {
  success: false
  error: {
    code: string
    message: string
    details?: ApiErrorDetails
  }
}
