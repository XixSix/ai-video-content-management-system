import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import * as jobsController from './jobs.controller'
import { jobParamsSchema } from './jobs.schema'

const router = Router()

router.use(authenticate)

router.get('/:jobId', validateRequest({ params: jobParamsSchema }), jobsController.get)
router.get('/:jobId/events', validateRequest({ params: jobParamsSchema }), jobsController.events)

export { router as jobsRoutes }
