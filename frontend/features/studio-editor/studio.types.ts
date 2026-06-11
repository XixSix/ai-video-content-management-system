import type { LucideIcon } from "lucide-react"

export type StudioToolId =
  | "media"
  | "assets"
  | "text"
  | "captions"
  | "audio"
  | "clips"
  | "ai"

export type StudioRailItem = {
  id: StudioToolId
  label: string
  icon: LucideIcon
}

export type StudioLayerKind = "image" | "text" | "captions"

export type StudioCanvasLayer = {
  id: string
  kind: StudioLayerKind
  label: string
  className: string
  summary: string
  frameClassName: string
}

export type StudioTimelineTone = "base" | "accent" | "muted"

export type StudioTimelineSegment = {
  id: string
  label: string
  widthClassName: string
  offsetClassName?: string
  tone: StudioTimelineTone
  selectionId: string
  summary: string
}

export type StudioTimelineTrack = {
  id: string
  label: string
  selectionId: string
  segments: StudioTimelineSegment[]
}

export type StudioSourceMedia = {
  id: string
  name: string
  durationLabel: string
  resolutionLabel: string
  summary: string
}

export type StudioToolPanelItem = {
  id: string
  label: string
  meta?: string
  selectionId?: string
}

export type StudioToolPanelSection = {
  id: string
  title: string
  items: StudioToolPanelItem[]
}

export type StudioToolPanelContent = {
  title: string
  sections: StudioToolPanelSection[]
}

export type StudioSelection =
  | {
      id: string
      kind: "source"
      label: string
      summary: string
    }
  | {
      id: string
      kind: "layer"
      label: string
      summary: string
      detail: string
    }
  | {
      id: string
      kind: "segment"
      label: string
      summary: string
      detail: string
      linkedSelectionId: string
      trackLabel: string
    }

export type StudioEditorProject = {
  sourceMedia: StudioSourceMedia
  layers: StudioCanvasLayer[]
  timelineTracks: StudioTimelineTrack[]
}
