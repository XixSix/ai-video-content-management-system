import { Volume2, VolumeX } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { StudioTimelineTrack } from "@/features/studio-editor/studio.types"
import { getTrackContentHeight } from "@/features/studio-editor/timeline/lib/layout"
import { cn } from "@/lib/utils"

const timelineLaneClassName =
  "relative min-h-12 border-t border-border/65 py-1.5 last:border-b"

export function TimelineTrackLabels({
  mutedTrackIds,
  onToggleTrackMute,
  tracks,
}: {
  mutedTrackIds: string[]
  onToggleTrackMute: (trackId: string) => void
  tracks: StudioTimelineTrack[]
}) {
  return (
    <div className="flex justify-center border-r border-border/80">
      <div className="w-full">
        <div className="h-8 border-b border-border/70" />
        {tracks.map((track) => {
          const trackIsMuted = mutedTrackIds.includes(track.id)
          const trackContentHeight = getTrackContentHeight(track)

          return (
            <div
              key={track.id}
              className={cn(
                timelineLaneClassName,
                track.id === "SOURCE" ? "min-h-[88px]" : null,
                track.id === "TEXT" ? "bg-blue-500/[0.025]" : null,
                track.id === "SOURCE" ? "bg-amber-500/[0.025]" : null,
                track.id === "AUDIO" ? "bg-cyan-500/[0.025]" : null
              )}
            >
              <div
                className="flex items-center justify-center"
                style={{ height: trackContentHeight }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    trackIsMuted
                      ? `Unmute ${track.label} track`
                      : `Mute ${track.label} track`
                  }
                  aria-pressed={trackIsMuted}
                  onClick={() => onToggleTrackMute(track.id)}
                  className="text-foreground-muted hover:bg-accent hover:text-foreground"
                >
                  {trackIsMuted ? (
                    <VolumeX className="size-4" />
                  ) : (
                    <Volume2 className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
