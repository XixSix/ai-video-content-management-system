import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import { requireWorkspaceMembership } from '../../middleware/workspace.middleware'
import * as editorSnapshotsController from './editor-snapshots.controller'
import { editorSnapshotParamsSchema, saveEditorSnapshotSchema } from './editor-snapshots.schema'

const router = Router()

router.use(authenticate, requireWorkspaceMembership)

router.get(
  '/:projectId/editor-snapshot',
  validateRequest({ params: editorSnapshotParamsSchema }),
  editorSnapshotsController.get
)
router.put(
  '/:projectId/editor-snapshot',
  validateRequest({ params: editorSnapshotParamsSchema, body: saveEditorSnapshotSchema }),
  editorSnapshotsController.save
)

export { router as editorSnapshotsRoutes }
