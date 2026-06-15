import {
  AudioLines,
  Clapperboard,
  FileText,
  Image,
  Mic,
  MoreHorizontal,
  Scissors,
  Sparkles,
  Upload,
} from "lucide-react"

import type {
  FeaturedTool,
  ProcessingSummary,
  QuickAction,
  ToolShortcut,
} from "./home.types"

export const homeQuickActions: QuickAction[] = [
  {
    id: "upload-media",
    label: "Upload Media",
    description: "Add source video or audio and route it into your workspace.",
    href: "/media-library",
    icon: Upload,
  },
  {
    id: "open-studio",
    label: "Open Studio",
    description: "Review transcripts, chapters, subtitles, and edit layers in the main workspace.",
    href: "/studio",
    icon: Clapperboard,
  },
  {
    id: "generate-clips",
    label: "Long to Short",
    description: "Review short-form moments and turn them into publishable drafts.",
    href: "/long-to-short",
    icon: Scissors,
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

export const homeFeaturedTools: FeaturedTool[] = [
  {
    id: "voiceover-video",
    title: "Voiceover for video",
    description: "Add realistic AI voiceovers to uploaded media and Studio edits.",
    href: "/text-to-speech",
  },
  {
    id: "content-flow",
    title: "Create a content flow",
    description: "Chain transcript, chapter, clip, and publish steps for one source.",
    href: "/studio",
  },
  {
    id: "clone-voice",
    title: "Clone a voice",
    description: "Prepare reusable voice assets for narration and publishing flows.",
    href: "/text-to-speech",
  },
]

export const homeToolShortcuts: ToolShortcut[] = [
  {
    id: "speech",
    label: "Speech",
    href: "/text-to-speech",
    icon: Mic,
  },
  {
    id: "voice-isolator",
    label: "Voice Isolator",
    href: "/studio",
    icon: AudioLines,
  },
  {
    id: "sound-effects",
    label: "Sound Effects",
    href: "/text-to-speech",
    icon: Sparkles,
  },
  {
    id: "image-video",
    label: "Image & Video",
    href: "/media-library",
    icon: Image,
  },
  {
    id: "speech-to-text",
    label: "Speech to Text",
    href: "/studio",
    icon: FileText,
  },
  {
    id: "more-tools",
    label: "More tools",
    href: "/studio",
    icon: MoreHorizontal,
  },
]

export const homeProcessingSummary: ProcessingSummary = {
  activeCount: 2,
  queuedCount: 1,
  completedTodayCount: 6,
  failedCount: 1,
}
