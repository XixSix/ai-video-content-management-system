import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const publishTaskFindManyMock = jest.fn()
const publishTaskCountMock = jest.fn()

jest.unstable_mockModule('../../infrastructure/db/prisma', () => ({
  prisma: {
    publishTask: {
      findMany: publishTaskFindManyMock,
      count: publishTaskCountMock
    }
  }
}))

const repository = await import('./publish-tasks.repository')

const userId = '00000000-0000-4000-8000-000000000001'
const mediaId = '00000000-0000-4000-8000-000000000002'
const platformAccountId = '00000000-0000-4000-8000-000000000003'

beforeEach(() => {
  jest.resetAllMocks()
})

describe('publish tasks repository', () => {
  it('lists publish tasks with search across task and related source/account fields', async () => {
    publishTaskFindManyMock.mockResolvedValue([])
    publishTaskCountMock.mockResolvedValue(0)

    await repository.findPublishTasksByUserId(
      {
        userId,
        mediaId,
        platformAccountId,
        platform: 'FACEBOOK',
        status: 'DRAFT',
        search: 'launch'
      },
      10,
      5,
      'scheduledAt',
      'asc'
    )

    const expectedWhere = {
      userId,
      platform: 'FACEBOOK',
      status: 'DRAFT',
      mediaId,
      platformAccountId,
      OR: [
        { title: { contains: 'launch', mode: 'insensitive' } },
        { caption: { contains: 'launch', mode: 'insensitive' } },
        { description: { contains: 'launch', mode: 'insensitive' } },
        {
          media: {
            is: {
              OR: [
                { title: { contains: 'launch', mode: 'insensitive' } },
                { originalFilename: { contains: 'launch', mode: 'insensitive' } }
              ]
            }
          }
        },
        {
          project: {
            is: {
              title: { contains: 'launch', mode: 'insensitive' }
            }
          }
        },
        {
          shortClip: {
            is: {
              title: { contains: 'launch', mode: 'insensitive' }
            }
          }
        },
        {
          platformAccount: {
            is: {
              accountName: { contains: 'launch', mode: 'insensitive' }
            }
          }
        }
      ]
    }

    expect(publishTaskFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        skip: 10,
        take: 5,
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }]
      })
    )
    expect(publishTaskCountMock).toHaveBeenCalledWith({ where: expectedWhere })
  })
})
