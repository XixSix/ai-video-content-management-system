import type { Response } from 'express'
import type { SuccessResponseBody } from '../types/response'

export const sendSuccess = <TData>(
  res: Response,
  data: TData,
  statusCode = 200
): Response<SuccessResponseBody<TData>> => {
  return res.status(statusCode).json({
    success: true,
    data
  })
}
