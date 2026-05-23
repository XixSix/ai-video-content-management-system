import { Router } from 'express'
import { settings } from '../config/index.js'

export const healthRouter = Router()

healthRouter.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      environment: settings.app.nodeEnv
    }
  })
})
