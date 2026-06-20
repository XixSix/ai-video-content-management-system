import type {
  ProjectSummary,
  StudioProjectCardData,
} from "./studio-projects.types"

const visualVariants: StudioProjectCardData["visualVariant"][] = [
  "teal",
  "slate",
  "olive",
  "ember",
]

function getStableVariant(projectId: string) {
  const hash = Array.from(projectId).reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  )

  return visualVariants[hash % visualVariants.length]
}

export function mapProjectToCard(project: ProjectSummary): StudioProjectCardData {
  const sourceType =
    project.sourceMedia?.type === "VIDEO" || project.sourceMedia?.type === "AUDIO"
      ? project.sourceMedia.type
      : null

  return {
    ...project,
    sourceLabel:
      project.sourceMedia?.title ??
      project.sourceMedia?.originalFilename ??
      "No source media",
    sourceType,
    visualVariant: getStableVariant(project.id),
  }
}
