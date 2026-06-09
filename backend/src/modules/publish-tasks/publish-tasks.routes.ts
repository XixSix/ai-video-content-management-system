import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import * as publishTasksController from './publish-tasks.controller'
import {
  createPublishTaskSchema,
  listPublishTasksQuerySchema,
  publishTaskParamsSchema,
  updatePublishTaskSchema
} from './publish-tasks.schema'

const router = Router()

router.use(authenticate)

router.post('/', validateRequest({ body: createPublishTaskSchema }), publishTasksController.create)
router.get('/', validateRequest({ query: listPublishTasksQuerySchema }), publishTasksController.list)
router.get('/:publishTaskId', validateRequest({ params: publishTaskParamsSchema }), publishTasksController.get)
router.patch(
  '/:publishTaskId',
  validateRequest({ params: publishTaskParamsSchema, body: updatePublishTaskSchema }),
  publishTasksController.update
)

export { router as publishTasksRoutes }
