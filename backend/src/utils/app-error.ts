export type ErrorDetails = Record<string, unknown> | Array<Record<string, unknown>>

export class AppError extends Error {
  public readonly code: string
  public readonly details?: ErrorDetails
  public readonly isOperational: boolean
  public readonly statusCode: number

  public constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details?: ErrorDetails) {
    super(message)

    this.code = code
    this.details = details
    this.isOperational = true
    this.statusCode = statusCode

    Error.captureStackTrace(this, this.constructor)
  }
}
