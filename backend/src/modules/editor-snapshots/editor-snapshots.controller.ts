import type { ParamsBodyRequestHandler, ParamsRequestHandler } from '../../types/express'
import { sendSuccess } from '../../utils/response'
import type { EditorSnapshotParams, SaveEditorSnapshotBody } from './editor-snapshots.schema'
import * as editorSnapshotsService from './editor-snapshots.service'
import type { EditorSnapshotData } from './editor-snapshots.types'

export const get: ParamsRequestHandler<EditorSnapshotParams> = async (req, res, next): Promise<void> => {
  try {
    const editorSnapshot = await editorSnapshotsService.getEditorSnapshot(req.workspace!.id, req.params.projectId)

    sendSuccess<{ editorSnapshot: EditorSnapshotData | null }>(res, { editorSnapshot })
  } catch (error: unknown) {
    next(error)
  }
}

export const save: ParamsBodyRequestHandler<EditorSnapshotParams, SaveEditorSnapshotBody> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const editorSnapshot = await editorSnapshotsService.saveEditorSnapshot(
      req.user!.id,
      req.workspace!.id,
      req.params.projectId,
      req.body
    )

    sendSuccess<{ editorSnapshot: EditorSnapshotData }>(res, { editorSnapshot })
  } catch (error: unknown) {
    next(error)
  }
}
