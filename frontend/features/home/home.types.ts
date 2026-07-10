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
  preview: {
    alt: string
    darkSrc: string
    lightSrc: string
  }
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
