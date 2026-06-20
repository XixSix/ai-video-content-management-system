import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { EditorSnapshot, Project } from '../../infrastructure/db/generated/prisma/client'

const findProjectByIdMock = jest.fn()
const findEditorSnapshotByProjectIdMock = jest.fn()
const createEditorSnapshotMock = jest.fn()
const updateEditorSnapshotIfVersionMock = jest.fn()
const isUniqueConstraintErrorMock = jest.fn()

jest.unstable_mockModule('./editor-snapshots.repository', () => ({
  findProjectById: findProjectByIdMock,
  findEditorSnapshotByProjectId: findEditorSnapshotByProjectIdMock,
  createEditorSnapshot: createEditorSnapshotMock,
  updateEditorSnapshotIfVersion: updateEditorSnapshotIfVersionMock,
  isUniqueConstraintError: isUniqueConstraintErrorMock
}))

const editorSnapshotsService = await import('./editor-snapshots.service')

const userId = '00000000-0000-4000-8000-000000000001'
const otherUserId = '00000000-0000-4000-8000-000000000002'
const workspaceId = '00000000-0000-4000-8000-000000000003'
const otherWorkspaceId = '00000000-0000-4000-8000-000000000004'
const projectId = '00000000-0000-4000-8000-000000000005'
const now = new Date('2026-06-20T10:00:00.000Z')
const document = {
  schemaVersion: 1 as const,
  settings: {
    aspectRatio: '9:16' as const
  },
  layers: [],
  timelineTracks: []
}

const createProject = (overrides: Partial<Project> = {}): Project => ({
  id: projectId,
  userId,
  workspaceId,
  sourceMediaId: null,
  thumbnailMediaId: null,
  title: 'Project',
  slug: 'project-12345678',
  status: 'DRAFT',
  aspectRatio: '9:16',
  duration: null,
  createdAt: now,
  updatedAt: now,
  ...overrides
})

const createSnapshot = (overrides: Partial<EditorSnapshot> = {}): EditorSnapshot => ({
  id: '00000000-0000-4000-8000-000000000006',
  projectId,
  version: 1,
  snapshot: document,
  savedByUserId: userId,
  savedAt: now,
  createdAt: now,
  updatedAt: now,
  ...overrides
})

beforeEach(() => {
  jest.resetAllMocks()
  findProjectByIdMock.mockResolvedValue(createProject())
  findEditorSnapshotByProjectIdMock.mockResolvedValue(null)
  createEditorSnapshotMock.mockResolvedValue(createSnapshot())
  updateEditorSnapshotIfVersionMock.mockResolvedValue(createSnapshot({ version: 2 }))
  isUniqueConstraintErrorMock.mockReturnValue(false)
})

describe('editor snapshots service', () => {
  it('returns null when a readable project has no saved snapshot', async () => {
    await expect(editorSnapshotsService.getEditorSnapshot(workspaceId, projectId)).resolves.toBeNull()
  })

  it('allows workspace reads and hides missing, deleted, or cross-workspace projects', async () => {
    findProjectByIdMock.mockResolvedValueOnce(createProject({ userId: otherUserId }))
    findEditorSnapshotByProjectIdMock.mockResolvedValueOnce(createSnapshot())

    await expect(editorSnapshotsService.getEditorSnapshot(workspaceId, projectId)).resolves.toMatchObject({
      projectId,
      version: 1
    })

    findProjectByIdMock.mockResolvedValueOnce(createProject({ status: 'DELETED' }))
    await expect(editorSnapshotsService.getEditorSnapshot(workspaceId, projectId)).rejects.toMatchObject({
      code: 'PROJECT_NOT_FOUND'
    })

    findProjectByIdMock.mockResolvedValueOnce(createProject({ workspaceId: otherWorkspaceId }))
    await expect(editorSnapshotsService.getEditorSnapshot(workspaceId, projectId)).rejects.toMatchObject({
      code: 'PROJECT_NOT_FOUND'
    })
  })

  it('creates the first creator-owned snapshot at version 1', async () => {
    await expect(
      editorSnapshotsService.saveEditorSnapshot(userId, workspaceId, projectId, {
        baseVersion: 0,
        document
      })
    ).resolves.toMatchObject({
      projectId,
      version: 1,
      document
    })

    expect(createEditorSnapshotMock).toHaveBeenCalledWith({
      projectId,
      snapshot: document,
      savedByUserId: userId
    })
  })

  it('increments an existing snapshot only when baseVersion matches', async () => {
    await expect(
      editorSnapshotsService.saveEditorSnapshot(userId, workspaceId, projectId, {
        baseVersion: 1,
        document
      })
    ).resolves.toMatchObject({
      version: 2
    })

    expect(updateEditorSnapshotIfVersionMock).toHaveBeenCalledWith(projectId, 1, document, userId)
  })

  it('rejects saves from workspace members who did not create the project', async () => {
    findProjectByIdMock.mockResolvedValue(createProject({ userId: otherUserId }))

    await expect(
      editorSnapshotsService.saveEditorSnapshot(userId, workspaceId, projectId, {
        baseVersion: 0,
        document
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    })
  })

  it('returns current version details for stale updates and missing snapshots', async () => {
    updateEditorSnapshotIfVersionMock.mockResolvedValue(null)
    findEditorSnapshotByProjectIdMock.mockResolvedValueOnce(createSnapshot({ version: 4 }))

    await expect(
      editorSnapshotsService.saveEditorSnapshot(userId, workspaceId, projectId, {
        baseVersion: 3,
        document
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'EDITOR_SNAPSHOT_VERSION_CONFLICT',
      details: {
        currentVersion: 4,
        baseVersion: 3
      }
    })

    findEditorSnapshotByProjectIdMock.mockResolvedValueOnce(null)
    await expect(
      editorSnapshotsService.saveEditorSnapshot(userId, workspaceId, projectId, {
        baseVersion: 2,
        document
      })
    ).rejects.toMatchObject({
      details: {
        currentVersion: 0,
        baseVersion: 2
      }
    })
  })

  it('maps concurrent initial creates to a version conflict', async () => {
    const uniqueError = new Error('P2002')
    createEditorSnapshotMock.mockRejectedValue(uniqueError)
    isUniqueConstraintErrorMock.mockReturnValue(true)
    findEditorSnapshotByProjectIdMock.mockResolvedValue(createSnapshot({ version: 1 }))

    await expect(
      editorSnapshotsService.saveEditorSnapshot(userId, workspaceId, projectId, {
        baseVersion: 0,
        document
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'EDITOR_SNAPSHOT_VERSION_CONFLICT',
      details: {
        currentVersion: 1,
        baseVersion: 0
      }
    })
  })
})
