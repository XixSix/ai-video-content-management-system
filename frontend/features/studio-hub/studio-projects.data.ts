import type {
  StudioProject,
  StudioProjectSortKey,
  StudioProjectStatus,
} from "./studio-projects.types"

export const studioProjects: StudioProject[] = [
  {
    id: "project-1",
    slug: "project-launch-campaign",
    name: "Project Launch Campaign",
    mainSourceMedia: "launch-keynote-v3.mp4",
    updatedAt: "2026-06-11T08:45:00.000Z",
    sourceType: "VIDEO",
    status: "NEEDS_REVIEW",
    thumbnailVariant: "teal",
  },
  {
    id: "project-2",
    slug: "founder-ama",
    name: "Founder AMA",
    mainSourceMedia: "founder-ama-ep42.wav",
    updatedAt: "2026-06-10T15:12:00.000Z",
    sourceType: "AUDIO",
    status: "PROCESSING",
    thumbnailVariant: "slate",
  },
  {
    id: "project-3",
    slug: "retail-customer-story",
    name: "Retail Customer Story",
    mainSourceMedia: "retail-story-master.mov",
    updatedAt: "2026-06-09T11:26:00.000Z",
    sourceType: "VIDEO",
    status: "READY",
    thumbnailVariant: "olive",
  },
  {
    id: "project-4",
    slug: "summer-shorts-batch",
    name: "Summer Shorts Batch",
    mainSourceMedia: "summer-social-cutdowns.mp4",
    updatedAt: "2026-06-08T09:40:00.000Z",
    sourceType: "VIDEO",
    status: "DRAFT",
    thumbnailVariant: "ember",
  },
  {
    id: "project-5",
    slug: "weekly-product-recap",
    name: "Weekly Product Recap",
    mainSourceMedia: "weekly-recap-take-2.mp4",
    updatedAt: "2026-06-07T17:18:00.000Z",
    sourceType: "VIDEO",
    status: "READY",
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
