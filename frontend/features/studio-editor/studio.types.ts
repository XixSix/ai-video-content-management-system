import type { LucideIcon } from "lucide-react"

export type StudioRailItem = {
  id: string
  label: string
  icon: LucideIcon
  isActive?: boolean
}

export type StudioOverlayItem = {
  id: string
  label: string
  kind: "image" | "text" | "captions"
  className: string
}

export type StudioTimelineTrack = {
  id: string
  label: string
  segments: Array<{
    id: string
    label: string
    widthClassName: string
    offsetClassName?: string
    tone: "base" | "accent" | "muted"
  }>
}
