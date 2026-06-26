export type PublishTaskStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"
  | "CANCELED"

export type PublishPlatform = "YOUTUBE" | "FACEBOOK"

export type PublishViewMode = "list" | "calendar"

export type PublishStatusFilter = "ALL" | PublishTaskStatus

export type PublishPlatformFilter = "ALL" | PublishPlatform

export type PublishSortKey = "newest" | "scheduledSoon" | "recentlyPublished"

export type PublishSourceType = "MEDIA" | "PROJECT" | "SHORT_CLIP"

export type PublishTask = {
  id: string
  mediaId: string | null
  projectId: string | null
  shortClipId: string | null
  sourceType: PublishSourceType
  thumbnailUrl: string | null
  sourceTitle: string
  sourceMeta: string
  aspectRatio: "16:9" | "9:16" | "1:1"
  durationLabel: string
  platform: PublishPlatform
  jobId: string | null
  platformAccountName: string
  title: string | null
  caption: string | null
  hashtags: string[]
  status: PublishTaskStatus
  progress: number | null
  scheduledAt: string | null
  publishedAt: string | null
  platformPostUrl: string | null
  errorMessage: string | null
  createdAt: string
}

export type PublishSourceOption = {
  id: string
  sourceType: PublishSourceType
  mediaId: string | null
  projectId: string | null
  shortClipId: string | null
  title: string
  meta: string
  thumbnailUrl: string | null
  aspectRatio: PublishTask["aspectRatio"]
  durationLabel: string
}

export type PublishAccountOption = {
  id: string
  platform: PublishPlatform
  accountName: string
  avatarUrl?: string | null
}

export type PublishStatusCount = {
  status: PublishTaskStatus
  label: string
  value: number
}

export type NewPublishTarget = {
  account: PublishAccountOption
  title: string
  caption: string
  hashtags: string[]
}

export type PublishPlatformContent = {
  title: string
  caption: string
  hashtags: string
}

export type NewPublishPayload = {
  source: PublishSourceOption
  targets: NewPublishTarget[]
  scheduledDate: Date | undefined
  scheduledTime: string
  status: "DRAFT" | "SCHEDULED" | "PUBLISHING"
}
