import {
  AudioLines,
  Clapperboard,
  FileText,
  Mic,
  Upload,
} from "lucide-react"

import type {
  ProcessingSummary,
  QuickAction,
  RecentMediaItem,
  RecentOutputItem,
} from "./home.types"

export const homeQuickActions: QuickAction[] = [
  {
    id: "upload-media",
    label: "Upload Media",
    description: "Add source video or audio and route it into your workspace.",
    href: "/media",
    icon: Upload,
  },
  {
    id: "open-studio",
    label: "Open Studio",
    description: "Review transcripts, chapters, subtitles, and clip candidates.",
    href: "/studio",
    icon: Clapperboard,
  },
  {
    id: "generate-clips",
    label: "Generate Clips",
    description: "Surface short-form moments from your long-form uploads.",
    href: "/studio",
    icon: AudioLines,
  },
  {
    id: "create-transcript",
    label: "Create Transcript",
    description: "Start a clean transcript workflow for editing and downstream AI.",
    href: "/studio",
    icon: FileText,
  },
  {
    id: "text-to-speech",
    label: "Text to Speech",
    description: "Create voiceovers and reusable spoken assets for publish flows.",
    href: "/text-to-speech",
    icon: Mic,
    isSoon: true,
  },
]

export const homeProcessingSummary: ProcessingSummary = {
  activeCount: 2,
  queuedCount: 1,
  completedTodayCount: 6,
  failedCount: 1,
}

export const homeRecentMedia: RecentMediaItem[] = [
  {
    id: "media-1",
    title: "Quarterly Product Launch Keynote",
    thumbnailUrl: null,
    duration: 1864,
    type: "VIDEO",
    status: "PROCESSING",
    updatedAt: "2026-06-10T09:48:00.000Z",
    hasTranscript: true,
    hasChapters: false,
    hasClips: false,
  },
  {
    id: "media-2",
    title: "Founder AMA Podcast Episode 42",
    thumbnailUrl: null,
    duration: 3246,
    type: "AUDIO",
    status: "UPLOADED",
    updatedAt: "2026-06-09T16:24:00.000Z",
    hasTranscript: false,
    hasChapters: false,
    hasClips: false,
  },
  {
    id: "media-3",
    title: "Customer Story Interview - Retail",
    thumbnailUrl: null,
    duration: 972,
    type: "VIDEO",
    status: "UPLOADED",
    updatedAt: "2026-06-08T13:12:00.000Z",
    hasTranscript: true,
    hasChapters: true,
    hasClips: true,
  },
  {
    id: "media-4",
    title: "Summer Campaign Social Cutdowns",
    thumbnailUrl: null,
    duration: 802,
    type: "VIDEO",
    status: "FAILED",
    updatedAt: "2026-06-08T05:37:00.000Z",
    hasTranscript: false,
    hasChapters: false,
    hasClips: false,
  },
]

export const homeRecentOutputs: RecentOutputItem[] = [
  {
    id: "output-1",
    title: "Launch keynote transcript v2",
    kind: "TRANSCRIPT",
    sourceMediaTitle: "Quarterly Product Launch Keynote",
    status: "READY",
    updatedAt: "2026-06-10T10:14:00.000Z",
  },
  {
    id: "output-2",
    title: "Retail interview chapter set",
    kind: "CHAPTERS",
    sourceMediaTitle: "Customer Story Interview - Retail",
    status: "READY",
    updatedAt: "2026-06-09T15:06:00.000Z",
  },
  {
    id: "output-3",
    title: "3 vertical clip candidates",
    kind: "CLIP",
    sourceMediaTitle: "Customer Story Interview - Retail",
    status: "PROCESSING",
    updatedAt: "2026-06-10T08:51:00.000Z",
    duration: 34,
  },
  {
    id: "output-4",
    title: "Vietnamese subtitle export",
    kind: "SUBTITLE",
    sourceMediaTitle: "Quarterly Product Launch Keynote",
    status: "FAILED",
    updatedAt: "2026-06-10T07:32:00.000Z",
  },
]
