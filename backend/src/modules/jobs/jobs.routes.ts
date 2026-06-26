import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import * as jobsController from './jobs.controller'
import { jobParamsSchema, listJobsQuerySchema } from './jobs.schema'

const router = Router()

router.use(authenticate)

router.get('/', validateRequest({ query: listJobsQuerySchema }), jobsController.list)
router.get('/:jobId', validateRequest({ params: jobParamsSchema }), jobsController.get)
router.get('/:jobId/events', validateRequest({ params: jobParamsSchema }), jobsController.events)

export { router as jobsRoutes }
