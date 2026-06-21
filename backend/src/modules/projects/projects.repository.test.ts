import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const projectCreateMock = jest.fn()
const projectFindUniqueOrThrowMock = jest.fn()
const projectUpdateMock = jest.fn()
const projectMediaCreateMock = jest.fn()
const projectMediaDeleteManyMock = jest.fn()
const transactionMock = jest.fn(async (callback: (transaction: unknown) => unknown) =>
  callback({
    project: {
      create: projectCreateMock,
      findUniqueOrThrow: projectFindUniqueOrThrowMock,
      update: projectUpdateMock
    },
    projectMedia: {
      create: projectMediaCreateMock,
      deleteMany: projectMediaDeleteManyMock
    }
  })
)

jest.unstable_mockModule('../../infrastructure/db/prisma', () => ({
  prisma: {
    $transaction: transactionMock
  }
}))

const projectsRepository = await import('./projects.repository')

const userId = '00000000-0000-4000-8000-000000000001'
const workspaceId = '00000000-0000-4000-8000-000000000002'
const projectId = '00000000-0000-4000-8000-000000000003'
const mediaId = '00000000-0000-4000-8000-000000000004'
const now = new Date('2026-06-20T10:00:00.000Z')

const project = {
  id: projectId,
  userId,
  workspaceId,
  sourceMediaId: mediaId,
  thumbnailMediaId: null,
  title: 'Project',
  slug: 'project-12345678',
  status: 'DRAFT',
  aspectRatio: '9:16',
  duration: 120,
  createdAt: now,
  updatedAt: now,
  sourceMedia: null,
  thumbnailMedia: null,
  projectMedia: []
}

const media = {
  id: mediaId,
  userId,
  workspaceId,
  type: 'VIDEO',
  title: 'Source',
  description: null,
  originalFilename: 'source.mp4',
  s3Bucket: 'vidpilot-media',
  s3Key: 'uploads/source.mp4',
  s3Region: 'us-east-1',
  s3Etag: '"etag"',
  uploadId: null,
  duration: 120,
  fileSizeBytes: BigInt(1024),
  mimeType: 'video/mp4',
  width: 1920,
  height: 1080,
  metadata: null,
  status: 'UPLOADED',
  createdAt: now,
  updatedAt: now
}

beforeEach(() => {
  jest.clearAllMocks()
  projectCreateMock.mockResolvedValue(project)
  projectFindUniqueOrThrowMock.mockResolvedValue(project)
  projectUpdateMock.mockResolvedValue(project)
  projectMediaCreateMock.mockResolvedValue({
    id: '00000000-0000-4000-8000-000000000005'
  })
  projectMediaDeleteManyMock.mockResolvedValue({ count: 1 })
})

describe('projects repository transactions', () => {
  it('creates a project and SOURCE ProjectMedia in one transaction', async () => {
    const projectData = {
      userId,
      workspaceId,
      sourceMediaId: mediaId,
      title: 'Project',
      slug: 'project-12345678',
      aspectRatio: '9:16',
      duration: 120,
      status: 'DRAFT' as const
    }

    await expect(projectsRepository.createProjectFromMedia(projectData, mediaId)).resolves.toEqual(project)

    expect(projectCreateMock).toHaveBeenCalledWith({
      data: projectData
    })
    expect(projectMediaCreateMock).toHaveBeenCalledWith({
      data: {
        projectId,
        mediaId,
        role: 'SOURCE'
      }
    })
    expect(projectFindUniqueOrThrowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: projectId }
      })
    )
  })

  it('replaces the SOURCE ProjectMedia and project source fields atomically', async () => {
    await expect(projectsRepository.replaceSourceMedia(projectId, media)).resolves.toEqual(project)

    expect(projectMediaDeleteManyMock).toHaveBeenCalledWith({
      where: {
        projectId,
        OR: [{ role: 'SOURCE' }, { mediaId }]
      }
    })
    expect(projectMediaCreateMock).toHaveBeenCalledWith({
      data: {
        projectId,
        mediaId,
        role: 'SOURCE'
      }
    })
    expect(projectUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: projectId },
        data: {
          sourceMediaId: mediaId,
          duration: 120
        }
      })
    )
  })
})
