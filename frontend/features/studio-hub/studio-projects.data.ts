import type {
  StudioProject,
  StudioProjectSortKey,
  StudioProjectStatus,
} from "./studio-projects.types"
import { mediaLibraryItems } from "@/features/media-library/media-library.data"

function getMediaLibraryItem(itemId: string) {
  const item = mediaLibraryItems.find((mediaItem) => mediaItem.id === itemId)

  if (!item) {
    throw new Error(`Missing mock media library item: ${itemId}`)
  }

  return item
}

const launchSource = getMediaLibraryItem("media-library-1")
const founderSource = getMediaLibraryItem("media-library-2")
const retailSource = getMediaLibraryItem("media-library-3")
const summerSource = getMediaLibraryItem("media-library-editor-1")
const recapSource = getMediaLibraryItem("media-library-editor-3")

export const studioProjects: StudioProject[] = [
  {
    id: "project-1",
    slug: "project-launch-campaign",
    name: "Project Launch Campaign",
    mainSourceMedia: launchSource.originalFilename,
    updatedAt: launchSource.updatedAt,
    sourceType: "VIDEO",
    status: "NEEDS_REVIEW",
    thumbnailUrl: launchSource.thumbnailUrl,
    thumbnailVariant: "teal",
  },
  {
    id: "project-2",
    slug: "founder-ama",
    name: "Founder AMA",
    mainSourceMedia: founderSource.originalFilename,
    updatedAt: founderSource.updatedAt,
    sourceType: "AUDIO",
    status: "PROCESSING",
    thumbnailUrl: founderSource.thumbnailUrl,
    thumbnailVariant: "slate",
  },
  {
    id: "project-3",
    slug: "retail-customer-story",
    name: "Retail Customer Story",
    mainSourceMedia: retailSource.originalFilename,
    updatedAt: retailSource.updatedAt,
    sourceType: "VIDEO",
    status: "READY",
    thumbnailUrl: retailSource.thumbnailUrl,
    thumbnailVariant: "olive",
  },
  {
    id: "project-4",
    slug: "summer-shorts-batch",
    name: "Summer Shorts Batch",
    mainSourceMedia: summerSource.originalFilename,
    updatedAt: summerSource.updatedAt,
    sourceType: "VIDEO",
    status: "DRAFT",
    thumbnailUrl: summerSource.thumbnailUrl,
    thumbnailVariant: "ember",
  },
  {
    id: "project-5",
    slug: "weekly-product-recap",
    name: "Weekly Product Recap",
    mainSourceMedia: recapSource.originalFilename,
    updatedAt: recapSource.updatedAt,
    sourceType: "VIDEO",
    status: "READY",
    thumbnailUrl: recapSource.thumbnailUrl,
    thumbnailVariant: "teal",
  },
]

export const studioProjectStatusOptions: Array<{
  label: string
  value: StudioProjectStatus | "ALL"
}> = [
  { label: "All projects", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Ready", value: "READY" },
  { label: "Needs review", value: "NEEDS_REVIEW" },
]

export const studioProjectSortOptions: Array<{
  label: string
  value: StudioProjectSortKey
}> = [
  { label: "Most recent", value: "recent" },
  { label: "Oldest first", value: "oldest" },
  { label: "Name", value: "name" },
]

function titleCaseSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function getStudioProjectBySlug(slug: string) {
  return studioProjects.find((project) => project.slug === slug)
}

export function getStudioProjectDisplayName(slug: string) {
  return getStudioProjectBySlug(slug)?.name ?? titleCaseSlug(slug)
}
