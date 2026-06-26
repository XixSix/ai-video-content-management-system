import type {
  PublishPlatform,
  PublishPlatformFilter,
  PublishSortKey,
  PublishStatusFilter,
} from "./publishing.types"

export const publishStatusFilterOptions: {
  label: string
  value: PublishStatusFilter
}[] = [
  { label: "All", value: "ALL" },
  { label: "Drafts", value: "DRAFT" },
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "Publishing", value: "PUBLISHING" },
  { label: "Published", value: "PUBLISHED" },
  { label: "Failed", value: "FAILED" },
  { label: "Canceled", value: "CANCELED" },
]

export const publishPlatformFilterOptions: {
  label: string
  value: PublishPlatformFilter
}[] = [
  { label: "All", value: "ALL" },
  { label: "YouTube", value: "YOUTUBE" },
  { label: "Facebook", value: "FACEBOOK" },
]

export const publishSortOptions: {
  label: string
  value: PublishSortKey
}[] = [
  { label: "Newest", value: "newest" },
  { label: "Scheduled soon", value: "scheduledSoon" },
  { label: "Recently published", value: "recentlyPublished" },
]

export const publishPlatformLabels: Record<PublishPlatform, string> = {
  YOUTUBE: "YouTube",
  FACEBOOK: "Facebook",
}
