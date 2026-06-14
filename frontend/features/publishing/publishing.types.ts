export type PublishTaskStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"

export type PublishPlatform = "YOUTUBE" | "TIKTOK" | "FACEBOOK" | "INSTAGRAM"

export type PublishViewMode = "list" | "calendar"

export type PublishStatusFilter = "ALL" | PublishTaskStatus

export type PublishPlatformFilter = "ALL" | PublishPlatform

export type PublishSortKey = "newest" | "scheduledSoon" | "recentlyPublished"

export type PublishSourceType = "MEDIA" | "SHORT_CLIP"

export type PublishTask = {
  id: string
  mediaId: string | null
  shortClipId: string | null
  sourceType: PublishSourceType
  thumbnailUrl: string | null
  sourceTitle: string
  sourceMeta: string
  aspectRatio: "16:9" | "9:16" | "1:1"
  durationLabel: string
  platform: PublishPlatform
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
