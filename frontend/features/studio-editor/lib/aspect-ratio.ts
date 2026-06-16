import type { StudioAspectRatio } from "../studio.types"

export const studioAspectRatioOptions: Array<{
  label: string
  value: StudioAspectRatio
}> = [
  { label: "9:16", value: "9:16" },
  { label: "1:1", value: "1:1" },
  { label: "4:5", value: "4:5" },
  { label: "16:9", value: "16:9" },
]

export function getAspectRatioValue(aspectRatio: StudioAspectRatio) {
  switch (aspectRatio) {
    case "1:1":
      return 1
    case "4:5":
      return 4 / 5
    case "16:9":
      return 16 / 9
    case "9:16":
    default:
      return 9 / 16
  }
}
