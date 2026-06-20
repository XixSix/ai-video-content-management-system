import type {
  ProjectStatus,
  StudioProjectSortKey,
} from "./studio-projects.types"

export const studioProjectStatusOptions: Array<{
  label: string
  value: ProjectStatus | "ALL"
}> = [
  { label: "All projects", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Active", value: "ACTIVE" },
  { label: "Archived", value: "ARCHIVED" },
]

export const studioProjectSortOptions: Array<{
  label: string
  value: StudioProjectSortKey
}> = [
  { label: "Most recent", value: "recent" },
  { label: "Oldest first", value: "oldest" },
  { label: "Name", value: "name" },
]
