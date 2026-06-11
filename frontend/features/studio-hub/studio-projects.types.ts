export type StudioProjectStatus =
  | "DRAFT"
  | "PROCESSING"
  | "READY"
  | "NEEDS_REVIEW"

export type StudioProjectSortKey = "recent" | "oldest" | "name"

export type StudioProject = {
  id: string
  slug: string
  name: string
  mainSourceMedia: string
  updatedAt: string
  sourceType: "VIDEO" | "AUDIO"
  status: StudioProjectStatus
  thumbnailVariant: "teal" | "slate" | "olive" | "ember"
}
