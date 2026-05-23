import { Router } from 'express'
import { authRoutes } from './auth/auth.routes'
import { healthRouter } from './health/health.routes'

export const apiRouter = Router()

apiRouter.use('/auth', authRoutes)
apiRouter.use(healthRouter)
