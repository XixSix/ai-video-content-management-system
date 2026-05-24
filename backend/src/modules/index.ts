import { Router } from 'express'
import { authRoutes } from './auth/auth.routes'
import { healthRouter } from './health/health.routes'
import { jobsRoutes } from './jobs/jobs.routes'
import { mediaRoutes } from './media/media.routes'
import { mediaTranscriptRoutes, transcriptsRoutes } from './transcripts/transcripts.routes'

export const apiRouter = Router()

apiRouter.use('/auth', authRoutes)
apiRouter.use('/media', mediaTranscriptRoutes)
apiRouter.use('/media', mediaRoutes)
apiRouter.use('/transcripts', transcriptsRoutes)
apiRouter.use('/jobs', jobsRoutes)
apiRouter.use(healthRouter)
