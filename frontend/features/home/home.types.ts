import type { LucideIcon } from "lucide-react"

export type QuickAction = {
  id: string
  label: string
  description: string
  href: string
  icon: LucideIcon
  isSoon?: boolean
}

export type FeaturedTool = {
  id: string
  title: string
  description: string
  href: string
}

export type ToolShortcut = {
  id: string
  label: string
  href: string
  icon: LucideIcon
}

export type ProcessingSummary = {
  activeCount: number
  queuedCount: number
  completedTodayCount: number
  failedCount: number
}

export type RecentMediaItem = {
  id: string
  title: string
  thumbnailUrl: string | null
  duration: number | null
  type: "VIDEO" | "AUDIO"
  status: "UPLOADING" | "UPLOADED" | "PROCESSING" | "FAILED"
  updatedAt: string
  hasTranscript: boolean
  hasChapters: boolean
  hasClips: boolean
}

export type RecentOutputItem = {
  id: string
  title: string
  kind: "TRANSCRIPT" | "CHAPTERS" | "CLIP" | "SUBTITLE"
  sourceMediaTitle: string
  status: "READY" | "PROCESSING" | "FAILED" | "DRAFT"
  updatedAt: string
  duration?: number
}
