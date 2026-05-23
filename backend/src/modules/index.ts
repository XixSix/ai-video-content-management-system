import { Router } from 'express'
import { authRoutes } from './auth/auth.routes'
import { healthRouter } from './health/health.routes'
import { mediaRoutes } from './media/media.routes'

export const apiRouter = Router()

apiRouter.use('/auth', authRoutes)
apiRouter.use('/media', mediaRoutes)
apiRouter.use(healthRouter)
