import type { PlatformAccountData } from "@/features/social-accounts/social-accounts.types"
import type { MediaLibraryItem } from "@/features/media-library/types/media-library.types"

import type {
  PublishAccountOption,
  PublishSourceOption,
  PublishTask,
} from "./publishing.types"
import type { PublishTaskResponseData } from "./services/publishing.service"

function formatDuration(value: number | null | undefined) {
  if (!value || value < 0) {
    return "Pending"
  }

  const totalSeconds = Math.round(value)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = `${totalSeconds % 60}`.padStart(2, "0")

  return `${minutes}:${seconds}`
}

function inferAspectRatio(
  width: number | null,
  height: number | null
): PublishTask["aspectRatio"] {
  if (!width || !height) {
    return "16:9"
  }

  const ratio = width / height

  if (Math.abs(ratio - 9 / 16) < 0.08) {
    return "9:16"
  }

  if (Math.abs(ratio - 1) < 0.08) {
    return "1:1"
  }

  return "16:9"
}

function normalizeAspectRatio(value: string | null | undefined): PublishTask["aspectRatio"] {
  if (value === "9:16" || value === "1:1" || value === "16:9") {
    return value
  }

  return "16:9"
}

function parseHashtags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .map((item) => (item.startsWith("#") ? item : `#${item}`))
}

export function mapPublishTaskResponse(task: PublishTaskResponseData): PublishTask {
  const sourceType = task.source?.type ?? (task.shortClipId ? "SHORT_CLIP" : task.projectId ? "PROJECT" : "MEDIA")
  const sourceTitle = task.source?.title ?? task.title ?? "Untitled publish"

  return {
    id: task.id,
    mediaId: task.mediaId,
    projectId: task.projectId,
    shortClipId: task.shortClipId,
    sourceType,
    thumbnailUrl: task.source?.thumbnailUrl ?? null,
    sourceTitle,
    sourceMeta:
      sourceType === "PROJECT"
        ? "Studio project"
        : sourceType === "SHORT_CLIP"
          ? "Generated short clip"
          : "Media Library",
    aspectRatio: normalizeAspectRatio(task.source?.aspectRatio),
    durationLabel: formatDuration(task.source?.duration),
    platform: task.platform,
    jobId: task.jobId,
    platformAccountName:
      task.platformAccount?.accountName ?? task.platformAccountId ?? "Account",
    title: task.title,
    caption: task.caption ?? task.description,
    hashtags: parseHashtags(task.hashtags),
    status: task.status,
    progress: task.status === "PUBLISHING" ? 70 : null,
    scheduledAt: task.scheduledAt,
    publishedAt: task.publishedAt,
    platformPostUrl: task.platformPostUrl,
    errorMessage: task.errorMessage,
    createdAt: task.createdAt,
  }
}

export function mapPlatformAccountToPublishOption(
  account: PlatformAccountData
): PublishAccountOption | null {
  if (
    account.status !== "CONNECTED" ||
    (account.platform !== "YOUTUBE" && account.platform !== "FACEBOOK")
  ) {
    return null
  }

  return {
    id: account.id,
    platform: account.platform,
    accountName: account.accountName ?? account.platform,
    avatarUrl: account.avatarUrl,
  }
}

export function mapMediaToPublishSource(
  media: MediaLibraryItem
): PublishSourceOption | null {
  if (media.status !== "UPLOADED" || media.type !== "VIDEO") {
    return null
  }

  return {
    id: media.id,
    sourceType: "MEDIA",
    mediaId: media.id,
    projectId: null,
    shortClipId: null,
    title: media.title,
    meta: "Media Library",
    thumbnailUrl: media.thumbnailUrl,
    aspectRatio: inferAspectRatio(media.width, media.height),
    durationLabel: formatDuration(media.duration),
  }
}

export function buildProjectPublishSource(input: {
  projectId: string
  title: string
  aspectRatio?: string | null
  duration?: number | null
}): PublishSourceOption {
  return {
    id: input.projectId,
    sourceType: "PROJECT",
    mediaId: null,
    projectId: input.projectId,
    shortClipId: null,
    title: input.title,
    meta: "Studio project",
    thumbnailUrl: null,
    aspectRatio: normalizeAspectRatio(input.aspectRatio),
    durationLabel: formatDuration(input.duration),
  }
}
