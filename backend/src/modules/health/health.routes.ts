import { Router } from 'express'
import { config } from '../../config/index'

export const healthRouter = Router()

healthRouter.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      environment: config.app.nodeEnv
    }
  })
})
