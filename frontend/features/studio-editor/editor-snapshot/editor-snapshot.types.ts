import type { EditorDocument } from "./editor-snapshot.schema"

export type SaveEditorSnapshotInput = {
  baseVersion: number
  document: EditorDocument
}

export type EditorSnapshotSaveStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error"
  | "conflict"
  | "view-only"

export type EditorSnapshotConflict = {
  baseVersion: number
  currentVersion: number
}
