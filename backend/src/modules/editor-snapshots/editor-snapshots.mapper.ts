import type { EditorSnapshot } from '../../infrastructure/db/generated/prisma/client'
import type { EditorDocument } from './editor-snapshots.schema'
import type { EditorSnapshotData } from './editor-snapshots.types'

export const toEditorSnapshotData = (snapshot: EditorSnapshot): EditorSnapshotData => ({
  projectId: snapshot.projectId,
  version: snapshot.version,
  document: snapshot.snapshot as EditorDocument,
  savedByUserId: snapshot.savedByUserId,
  savedAt: snapshot.savedAt
})
