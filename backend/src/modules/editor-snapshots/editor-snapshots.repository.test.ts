import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const projectFindUniqueMock = jest.fn()
const snapshotFindUniqueMock = jest.fn()
const snapshotCreateMock = jest.fn()
const snapshotUpdateManyAndReturnMock = jest.fn()

jest.unstable_mockModule('../../infrastructure/db/prisma', () => ({
  prisma: {
    project: {
      findUnique: projectFindUniqueMock
    },
    editorSnapshot: {
      findUnique: snapshotFindUniqueMock,
      create: snapshotCreateMock,
      updateManyAndReturn: snapshotUpdateManyAndReturnMock
    }
  }
}))

const editorSnapshotsRepository = await import('./editor-snapshots.repository')

const userId = '00000000-0000-4000-8000-000000000001'
const projectId = '00000000-0000-4000-8000-000000000002'
const document = {
  schemaVersion: 1,
  settings: { aspectRatio: '9:16' },
  layers: [],
  timelineTracks: []
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('editor snapshots repository', () => {
  it('creates the initial snapshot at version 1', async () => {
    const savedAt = new Date('2026-06-20T10:00:00.000Z')
    snapshotCreateMock.mockResolvedValue({
      projectId,
      version: 1,
      snapshot: document,
      savedByUserId: userId,
      savedAt
    })

    await editorSnapshotsRepository.createEditorSnapshot({
      projectId,
      snapshot: document,
      savedByUserId: userId
    })

    expect(snapshotCreateMock).toHaveBeenCalledWith({
      data: {
        projectId,
        version: 1,
        snapshot: document,
        savedByUserId: userId,
        savedAt: expect.any(Date)
      }
    })
  })

  it('conditionally increments the version and returns null for stale saves', async () => {
    snapshotUpdateManyAndReturnMock.mockResolvedValueOnce([
      {
        projectId,
        version: 3,
        snapshot: document,
        savedByUserId: userId,
        savedAt: new Date()
      }
    ])

    await expect(
      editorSnapshotsRepository.updateEditorSnapshotIfVersion(projectId, 2, document, userId)
    ).resolves.toMatchObject({
      version: 3
    })
    expect(snapshotUpdateManyAndReturnMock).toHaveBeenCalledWith({
      where: {
        projectId,
        version: 2
      },
      data: {
        version: {
          increment: 1
        },
        snapshot: document,
        savedByUserId: userId,
        savedAt: expect.any(Date)
      }
    })

    snapshotUpdateManyAndReturnMock.mockResolvedValueOnce([])
    await expect(
      editorSnapshotsRepository.updateEditorSnapshotIfVersion(projectId, 2, document, userId)
    ).resolves.toBeNull()
  })
})
