import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import { requireWorkspaceMembership } from '../../middleware/workspace.middleware'
import * as projectsController from './projects.controller'
import {
  addProjectMediaSchema,
  createBlankProjectSchema,
  createProjectFromMediaSchema,
  listProjectsQuerySchema,
  projectMediaParamsSchema,
  projectParamsSchema,
  setProjectSourceMediaSchema,
  updateProjectSchema
} from './projects.schema'

const router = Router()

router.use(authenticate, requireWorkspaceMembership)

router.get('/', validateRequest({ query: listProjectsQuerySchema }), projectsController.list)
router.post('/blank', validateRequest({ body: createBlankProjectSchema }), projectsController.createBlank)
router.post('/from-media', validateRequest({ body: createProjectFromMediaSchema }), projectsController.createFromMedia)
router.get('/:projectId', validateRequest({ params: projectParamsSchema }), projectsController.get)
router.patch(
  '/:projectId',
  validateRequest({ params: projectParamsSchema, body: updateProjectSchema }),
  projectsController.update
)
router.delete('/:projectId', validateRequest({ params: projectParamsSchema }), projectsController.remove)
router.put(
  '/:projectId/source-media',
  validateRequest({ params: projectParamsSchema, body: setProjectSourceMediaSchema }),
  projectsController.setSourceMedia
)
router.post(
  '/:projectId/media',
  validateRequest({ params: projectParamsSchema, body: addProjectMediaSchema }),
  projectsController.addMedia
)
router.delete(
  '/:projectId/media/:projectMediaId',
  validateRequest({ params: projectMediaParamsSchema }),
  projectsController.removeMedia
)

export { router as projectsRoutes }
