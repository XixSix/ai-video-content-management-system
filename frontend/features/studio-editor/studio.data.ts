import {
  AudioLines,
  Captions,
  Clapperboard,
  FolderOpen,
  Scissors,
  Sparkles,
  Type,
} from "lucide-react"

import type {
  StudioOverlayItem,
  StudioRailItem,
  StudioTimelineTrack,
} from "./studio.types"

export const studioRailItems: StudioRailItem[] = [
  {
    id: "media",
    label: "Media",
    icon: Clapperboard,
    isActive: true,
  },
  {
    id: "assets",
    label: "Assets",
    icon: FolderOpen,
  },
  {
    id: "text",
    label: "Text",
    icon: Type,
  },
  {
    id: "captions",
    label: "Captions",
    icon: Captions,
  },
  {
    id: "audio",
    label: "Audio",
    icon: AudioLines,
  },
  {
    id: "clips",
    label: "Clips",
    icon: Scissors,
  },
  {
    id: "ai",
    label: "AI",
    icon: Sparkles,
  },
]

export const studioCanvasOverlays: StudioOverlayItem[] = [
  {
    id: "brand-mark",
    label: "Brand mark",
    kind: "image",
    className:
      "absolute left-[8%] top-[9%] rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-[11px] font-medium text-white shadow-lg backdrop-blur-sm",
  },
  {
    id: "hook-copy",
    label: "Hook text",
    kind: "text",
    className:
      "absolute left-[8%] top-[16%] max-w-[44%] rounded-xl bg-black/58 px-4 py-3 text-lg font-semibold leading-tight text-white shadow-xl",
  },
  {
    id: "captions",
    label: "Live caption preview",
    kind: "captions",
    className:
      "absolute inset-x-[18%] bottom-[10%] rounded-xl bg-black/72 px-4 py-3 text-center text-sm font-medium text-white shadow-xl",
  },
]

export const studioTimelineTracks: StudioTimelineTrack[] = [
  {
    id: "video",
    label: "Video",
    segments: [
      {
        id: "video-main",
        label: "Source cut",
        widthClassName: "w-[56%]",
        tone: "base",
      },
    ],
  },
  {
    id: "captions",
    label: "Captions",
    segments: [
      {
        id: "caption-a",
        label: "Intro lines",
        widthClassName: "w-[24%]",
        offsetClassName: "ml-[10%]",
        tone: "accent",
      },
      {
        id: "caption-b",
        label: "Main phrase",
        widthClassName: "w-[18%]",
        offsetClassName: "ml-[7%]",
        tone: "accent",
      },
    ],
  },
  {
    id: "overlays",
    label: "Overlays",
    segments: [
      {
        id: "overlay-logo",
        label: "Logo",
        widthClassName: "w-[14%]",
        offsetClassName: "ml-[8%]",
        tone: "muted",
      },
      {
        id: "overlay-title",
        label: "Hook title",
        widthClassName: "w-[20%]",
        offsetClassName: "ml-[12%]",
        tone: "muted",
      },
    ],
  },
  {
    id: "audio",
    label: "Audio",
    segments: [
      {
        id: "audio-bed",
        label: "Bed track",
        widthClassName: "w-[44%]",
        offsetClassName: "ml-[18%]",
        tone: "base",
      },
    ],
  },
]
