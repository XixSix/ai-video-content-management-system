import type { AppRequestHandler } from '../../types/express'
import * as healthService from './health.service'

export const getHealth: AppRequestHandler = async (_req, res, next): Promise<void> => {
  try {
    const health = await healthService.getHealth()
    const statusCode = health.status === 'ok' ? 200 : 503

    res.status(statusCode).json({
      success: health.status === 'ok',
      data: health
    })
  } catch (error: unknown) {
    next(error)
  }
}
