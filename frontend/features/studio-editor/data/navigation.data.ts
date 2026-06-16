import {
  AudioLines,
  Captions,
  Clapperboard,
  FolderOpen,
  ListTree,
  Sparkles,
  Type,
} from "lucide-react"

import type { StudioRailItem } from "../studio.types"

export const studioRailItems: StudioRailItem[] = [
  { id: "media", label: "Media", icon: Clapperboard },
  { id: "assets", label: "Assets", icon: FolderOpen },
  { id: "text", label: "Text", icon: Type },
  { id: "captions", label: "Captions", icon: Captions },
  { id: "chapters", label: "Chapters", icon: ListTree },
  { id: "audio", label: "Audio", icon: AudioLines },
  { id: "ai", label: "AI", icon: Sparkles },
]
