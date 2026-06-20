import { Prisma, type EditorSnapshot, type Project } from '../../infrastructure/db/generated/prisma/client'
import { prisma } from '../../infrastructure/db/prisma'

export const findProjectById = async (projectId: string): Promise<Project | null> =>
  prisma.project.findUnique({
    where: { id: projectId }
  })

export const findEditorSnapshotByProjectId = async (projectId: string): Promise<EditorSnapshot | null> =>
  prisma.editorSnapshot.findUnique({
    where: { projectId }
  })

export const createEditorSnapshot = async (data: {
  projectId: string
  snapshot: Prisma.InputJsonValue
  savedByUserId: string
}): Promise<EditorSnapshot> =>
  prisma.editorSnapshot.create({
    data: {
      projectId: data.projectId,
      version: 1,
      snapshot: data.snapshot,
      savedByUserId: data.savedByUserId,
      savedAt: new Date()
    }
  })

export const updateEditorSnapshotIfVersion = async (
  projectId: string,
  baseVersion: number,
  snapshot: Prisma.InputJsonValue,
  savedByUserId: string
): Promise<EditorSnapshot | null> => {
  const [updatedSnapshot] = await prisma.editorSnapshot.updateManyAndReturn({
    where: {
      projectId,
      version: baseVersion
    },
    data: {
      version: {
        increment: 1
      },
      snapshot,
      savedByUserId,
      savedAt: new Date()
    }
  })

  return updatedSnapshot ?? null
}

export const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
