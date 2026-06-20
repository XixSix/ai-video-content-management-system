import type { EditorDocument } from './editor-snapshots.schema'

export interface EditorSnapshotData {
  projectId: string
  version: number
  document: EditorDocument
  savedByUserId: string | null
  savedAt: Date
}
