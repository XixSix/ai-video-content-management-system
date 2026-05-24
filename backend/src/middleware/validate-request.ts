import type { RequestHandler } from 'express'
import { z } from 'zod'
import { AppError } from '../utils/app-error'

type RequestPart = 'body' | 'params' | 'query'
export type RequestValidationSchema = Partial<Record<RequestPart, z.ZodType>>

const formatIssues = (error: z.ZodError): Array<Record<string, unknown>> =>
  error.issues.map(
    (issue): Record<string, unknown> => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code
    })
  )

const setRequestPart = (req: Parameters<RequestHandler>[0], key: RequestPart, value: unknown): void => {
  Object.defineProperty(req, key, {
    value,
    configurable: true,
    enumerable: true,
    writable: true
  })
}

export const validateRequest =
  (schema: RequestValidationSchema): RequestHandler =>
  (req, _res, next): void => {
    for (const key of Object.keys(schema) as RequestPart[]) {
      const validator = schema[key]

      if (!validator) {
        continue
      }

      const result = validator.safeParse(req[key])

      if (!result.success) {
        return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', formatIssues(result.error)))
      }

      setRequestPart(req, key, result.data)
    }

    return next()
  }
