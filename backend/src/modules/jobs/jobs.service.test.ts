import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { ProcessingJob } from '../../infrastructure/db/generated/prisma/client'

const findJobByIdAndUserIdMock = jest.fn<(id: string, userId: string) => Promise<ProcessingJob | null>>()
const findJobsByUserIdMock =
  jest.fn<(filters: unknown, skip: number, take: number) => Promise<[ProcessingJob[], number]>>()

jest.unstable_mockModule('./jobs.repository', () => ({
  findJobByIdAndUserId: findJobByIdAndUserIdMock,
  findJobsByUserId: findJobsByUserIdMock
}))

const jobsService = await import('./jobs.service')

const jobId = '00000000-0000-4000-8000-000000000001'
const mediaId = '00000000-0000-4000-8000-000000000002'
const userId = '00000000-0000-4000-8000-000000000003'
const now = new Date('2026-05-24T10:00:00.000Z')

const createProcessingJob = (overrides: Partial<ProcessingJob> = {}): ProcessingJob => ({
  id: jobId,
  mediaId,
  userId,
  jobType: 'TRANSCRIBE',
  status: 'TRANSCRIBING',
  progress: 55,
  errorCode: null,
  errorMessage: null,
  queueName: 'transcript',
  taskName: 'transcribe',
  externalTaskId: 'external-task-id',
  attemptCount: 1,
  input: { language: 'en' },
  output: { transcriptId: '00000000-0000-4000-8000-000000000004' },
  createdAt: now,
  updatedAt: now,
  startedAt: now,
  completedAt: null,
  ...overrides
})

describe('jobs service', () => {
  beforeEach(() => {
    findJobByIdAndUserIdMock.mockReset()
    findJobsByUserIdMock.mockReset()
  })

  it('lists recent jobs with filters and pagination', async () => {
    findJobsByUserIdMock.mockResolvedValue([[createProcessingJob()], 1])

    const result = await jobsService.listJobs(userId, {
      page: 2,
      limit: 5,
      status: 'TRANSCRIBING',
      jobType: 'TRANSCRIBE'
    })

    expect(findJobsByUserIdMock).toHaveBeenCalledWith(
      {
        userId,
        status: 'TRANSCRIBING',
        jobType: 'TRANSCRIBE'
      },
      5,
      5
    )
    expect(result).toEqual({
      items: [
        {
          id: jobId,
          mediaId,
          jobType: 'TRANSCRIBE',
          status: 'TRANSCRIBING',
          progress: 55,
          errorCode: null,
          errorMessage: null,
          output: { transcriptId: '00000000-0000-4000-8000-000000000004' },
          attemptCount: 1,
          createdAt: now,
          updatedAt: now,
          startedAt: now,
          completedAt: null
        }
      ],
      total: 1,
      page: 2,
      limit: 5,
      totalPages: 1
    })
  })

  it('returns a mapped job owned by the user', async () => {
    findJobByIdAndUserIdMock.mockResolvedValue(createProcessingJob())

    const job = await jobsService.getJob(userId, jobId)

    expect(findJobByIdAndUserIdMock).toHaveBeenCalledWith(jobId, userId)
    expect(job).toEqual({
      id: jobId,
      mediaId,
      jobType: 'TRANSCRIBE',
      status: 'TRANSCRIBING',
      progress: 55,
      errorCode: null,
      errorMessage: null,
      output: { transcriptId: '00000000-0000-4000-8000-000000000004' },
      attemptCount: 1,
      createdAt: now,
      updatedAt: now,
      startedAt: now,
      completedAt: null
    })
    expect(job).not.toHaveProperty('queueName')
    expect(job).not.toHaveProperty('taskName')
    expect(job).not.toHaveProperty('externalTaskId')
    expect(job).not.toHaveProperty('input')
  })

  it('returns media preview job types without special-case mapping', async () => {
    findJobByIdAndUserIdMock.mockResolvedValue(
      createProcessingJob({
        jobType: 'GENERATE_THUMBNAIL',
        status: 'PENDING',
        queueName: 'media_previews_queue',
        taskName: 'generate_thumbnail'
      })
    )

    await expect(jobsService.getJob(userId, jobId)).resolves.toMatchObject({
      id: jobId,
      jobType: 'GENERATE_THUMBNAIL',
      status: 'PENDING'
    })
  })

  it('throws JOB_NOT_FOUND when the job is missing or belongs to another user', async () => {
    findJobByIdAndUserIdMock.mockResolvedValue(null)

    await expect(jobsService.getJob(userId, jobId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'JOB_NOT_FOUND'
    })
  })

  it.each([
    ['TRANSCRIBING', 'job.updated'],
    ['COMPLETED', 'job.completed'],
    ['FAILED', 'job.failed']
  ] as const)('maps %s status to %s event', (status, eventName) => {
    expect(
      jobsService.getJobEventName({
        id: jobId,
        mediaId,
        jobType: 'TRANSCRIBE',
        status,
        progress: 55,
        errorCode: null,
        errorMessage: null,
        output: null,
        attemptCount: 0,
        createdAt: now,
        updatedAt: now,
        startedAt: null,
        completedAt: null
      })
    ).toBe(eventName)
  })
})
