import { Badge } from "@/components/ui/badge"
import type { MediaLibraryItem } from "../types/media-library.types"

type MediaLibraryOutputChipsProps = {
  item: MediaLibraryItem
}

export function MediaLibraryOutputChips({
  item,
}: MediaLibraryOutputChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant={item.hasTranscript ? "success" : "neutral"}>
        Transcript
      </Badge>
      <Badge variant={item.hasChapters ? "success" : "neutral"}>
        Chapters
      </Badge>
      <Badge variant={item.hasClips ? "success" : "neutral"}>Clips</Badge>
      <Badge variant={item.hasSubtitles ? "success" : "neutral"}>
        Subtitles
      </Badge>
    </div>
  )
}

