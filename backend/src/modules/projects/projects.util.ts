import { randomUUID } from 'node:crypto'

export type ProjectAspectRatio = '9:16' | '4:5' | '1:1' | '16:9'

const supportedAspectRatios: ReadonlyArray<{
  label: ProjectAspectRatio
  value: number
}> = [
  { label: '9:16', value: 9 / 16 },
  { label: '4:5', value: 4 / 5 },
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 }
]

export const getClosestProjectAspectRatio = (width: number, height: number): ProjectAspectRatio => {
  const ratio = width / height

  return supportedAspectRatios.reduce((closest, candidate) => {
    const candidateDistance = Math.abs(Math.log(ratio / candidate.value))
    const closestDistance = Math.abs(Math.log(ratio / closest.value))

    return candidateDistance < closestDistance ? candidate : closest
  }).label
}

export const createProjectSlug = (title: string): string => {
  const normalizedTitle = title
    .normalize('NFKD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 80)
  const prefix = normalizedTitle || 'project'
  const suffix = randomUUID().replaceAll('-', '').slice(0, 8)

  return `${prefix}-${suffix}`
}
