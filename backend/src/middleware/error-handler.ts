import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { config } from '../config/index'
import { AppError } from '../utils/app-error'

const toValidationDetails = (error: ZodError): Array<Record<string, unknown>> =>
  error.issues.map(
    (issue): Record<string, unknown> => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code
    })
  )

export const notFoundHandler: RequestHandler = (req, _res, next): void => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'))
}

export const globalErrorHandler: ErrorRequestHandler = (error, _req, res, _next): void => {
  void _next

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: toValidationDetails(error)
      }
    })
    return
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    })
    return
  }

  const message = config.app.isProduction ? 'Internal server error' : error?.message || 'Internal server error'

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
      stack: config.app.isProduction ? undefined : error?.stack
    }
  })
}
