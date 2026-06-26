import { prisma } from '../../infrastructure/db/prisma'
import { AssetType, ProjectStatus } from '../../infrastructure/db/generated/prisma/client'
import type {
  GeneratedAsset,
  Media,
  Platform,
  ProcessingJob,
  Prisma,
  PublishStatus,
  PublishTask,
  ShortClip
} from '../../infrastructure/db/generated/prisma/client'
import type { PublishTaskSortField, SortOrder } from './publish-tasks.types'

export interface ListPublishTasksFilters {
  userId: string
  platform?: Platform
  status?: PublishStatus
  mediaId?: string
  projectId?: string
  shortClipId?: string
  platformAccountId?: string
}

const publishProjectArgs = {
  include: {
    sourceMedia: true,
    editorSnapshot: true
  }
} satisfies Prisma.ProjectDefaultArgs

export type PublishProjectRecord = Prisma.ProjectGetPayload<typeof publishProjectArgs>

const buildPublishTaskWhere = (filters: ListPublishTasksFilters): Prisma.PublishTaskWhereInput => ({
  userId: filters.userId,
  ...(filters.platform ? { platform: filters.platform } : {}),
  ...(filters.status ? { status: filters.status } : {}),
  ...(filters.mediaId ? { mediaId: filters.mediaId } : {}),
  ...(filters.projectId ? { projectId: filters.projectId } : {}),
  ...(filters.shortClipId ? { shortClipId: filters.shortClipId } : {}),
  ...(filters.platformAccountId ? { platformAccountId: filters.platformAccountId } : {})
})

export const createPublishTask = async (data: Prisma.PublishTaskUncheckedCreateInput): Promise<PublishTask> =>
  prisma.publishTask.create({ data })

export const findPublishTasksByUserId = async (
  filters: ListPublishTasksFilters,
  skip: number,
  take: number,
  sortBy: PublishTaskSortField,
  sortOrder: SortOrder
): Promise<[PublishTask[], number]> => {
  const where = buildPublishTaskWhere(filters)

  return Promise.all([
    prisma.publishTask.findMany({
      where,
      skip,
      take,
      orderBy: [{ [sortBy]: sortOrder }, { createdAt: 'desc' }]
    }),
    prisma.publishTask.count({ where })
  ])
}

export const findPublishTaskById = async (id: string): Promise<PublishTask | null> =>
  prisma.publishTask.findUnique({
    where: { id }
  })

export const updatePublishTask = async (
  id: string,
  data: Prisma.PublishTaskUncheckedUpdateInput
): Promise<PublishTask> =>
  prisma.publishTask.update({
    where: { id },
    data
  })

export const createProcessingJob = async (data: Prisma.ProcessingJobUncheckedCreateInput): Promise<ProcessingJob> =>
  prisma.processingJob.create({ data })

export const findProcessingJobById = async (id: string): Promise<ProcessingJob | null> =>
  prisma.processingJob.findUnique({
    where: { id }
  })

export const updateProcessingJob = async (
  id: string,
  data: Prisma.ProcessingJobUncheckedUpdateInput
): Promise<ProcessingJob> =>
  prisma.processingJob.update({
    where: { id },
    data
  })

export const findMediaById = async (id: string): Promise<Media | null> =>
  prisma.media.findUnique({
    where: { id }
  })

export const findShortClipById = async (id: string): Promise<ShortClip | null> =>
  prisma.shortClip.findUnique({
    where: { id }
  })

export const findProjectById = async (id: string): Promise<PublishProjectRecord | null> =>
  prisma.project.findUnique({
    where: { id },
    ...publishProjectArgs
  })

export const findFreshProjectExportAsset = async (
  projectId: string,
  snapshotId: string,
  snapshotVersion: number
): Promise<GeneratedAsset | null> => {
  const assets = await prisma.generatedAsset.findMany({
    where: {
      projectId,
      assetType: AssetType.EXPORT_VIDEO
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  })

  return (
    assets.find((asset: GeneratedAsset): boolean => {
      if (!asset.metadata || typeof asset.metadata !== 'object' || Array.isArray(asset.metadata)) {
        return false
      }

      return asset.metadata.snapshotId === snapshotId && asset.metadata.snapshotVersion === snapshotVersion
    }) ?? null
  )
}

export const isDeletedProject = (status: ProjectStatus): boolean => status === ProjectStatus.DELETED
