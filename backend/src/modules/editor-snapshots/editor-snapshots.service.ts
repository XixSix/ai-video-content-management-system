import { Prisma, ProjectStatus } from '../../infrastructure/db/generated/prisma/client'
import { EditorSnapshotsError } from './editor-snapshots.error'
import { toEditorSnapshotData } from './editor-snapshots.mapper'
import * as editorSnapshotsRepo from './editor-snapshots.repository'
import type { SaveEditorSnapshotBody } from './editor-snapshots.schema'
import type { EditorSnapshotData } from './editor-snapshots.types'

const getReadableProject = async (workspaceId: string, projectId: string) => {
  const project = await editorSnapshotsRepo.findProjectById(projectId)

  if (!project || project.workspaceId !== workspaceId || project.status === ProjectStatus.DELETED) {
    throw EditorSnapshotsError.projectNotFound()
  }

  return project
}

const getCurrentVersion = async (projectId: string): Promise<number> =>
  (await editorSnapshotsRepo.findEditorSnapshotByProjectId(projectId))?.version ?? 0

export const getEditorSnapshot = async (workspaceId: string, projectId: string): Promise<EditorSnapshotData | null> => {
  await getReadableProject(workspaceId, projectId)
  const snapshot = await editorSnapshotsRepo.findEditorSnapshotByProjectId(projectId)

  return snapshot ? toEditorSnapshotData(snapshot) : null
}

export const saveEditorSnapshot = async (
  userId: string,
  workspaceId: string,
  projectId: string,
  body: SaveEditorSnapshotBody
): Promise<EditorSnapshotData> => {
  const project = await getReadableProject(workspaceId, projectId)

  if (project.userId !== userId) {
    throw EditorSnapshotsError.forbidden()
  }

  const snapshot = body.document as unknown as Prisma.InputJsonValue

  if (body.baseVersion === 0) {
    try {
      return toEditorSnapshotData(
        await editorSnapshotsRepo.createEditorSnapshot({
          projectId,
          snapshot,
          savedByUserId: userId
        })
      )
    } catch (error: unknown) {
      if (!editorSnapshotsRepo.isUniqueConstraintError(error)) {
        throw error
      }

      throw EditorSnapshotsError.versionConflict(await getCurrentVersion(projectId), body.baseVersion)
    }
  }

  const updatedSnapshot = await editorSnapshotsRepo.updateEditorSnapshotIfVersion(
    projectId,
    body.baseVersion,
    snapshot,
    userId
  )

  if (!updatedSnapshot) {
    throw EditorSnapshotsError.versionConflict(await getCurrentVersion(projectId), body.baseVersion)
  }

  return toEditorSnapshotData(updatedSnapshot)
}
