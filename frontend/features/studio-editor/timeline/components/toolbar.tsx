import {
  ChevronDown,
  Minus,
  Pause,
  Play,
  Plus,
  Scissors,
  SkipBack,
  SkipForward,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatTimeLabel } from "@/features/studio-editor/timeline/lib/time"

const timelineIconButtonClassName =
  "grid place-items-center text-foreground-muted hover:bg-accent hover:text-foreground"

export function TimelineToolbar({
  currentTime,
  isCollapsed,
  isPlaying,
  onSeekForward,
  onSeekRewind,
  onToggleCollapse,
  onTogglePlayback,
  onZoomIn,
  onZoomOut,
  onZoomSliderChange,
  timelineDurationSeconds,
  zoomInDisabled,
  zoomOutDisabled,
  zoomPercent,
}: {
  currentTime: number
  isCollapsed: boolean
  isPlaying: boolean
  onSeekForward: () => void
  onSeekRewind: () => void
  onToggleCollapse: () => void
  onTogglePlayback: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomSliderChange: (sliderValue: number) => void
  timelineDurationSeconds: number
  zoomInDisabled: boolean
  zoomOutDisabled: boolean
  zoomPercent: number
}) {
  return (
    <div
      className={cn(
        "relative flex h-12 shrink-0 items-center px-4 text-sm",
        isCollapsed ? null : "border-b border-border"
      )}
    >
      <div className="relative z-10 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 rounded-md px-2 text-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronDown className="size-4" />
          {isCollapsed ? "Show timeline" : "Hide timeline"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Split track"
          className="h-8 rounded-md px-2 text-foreground hover:bg-accent hover:text-foreground"
        >
          <Scissors className="size-4" />
          Split track
        </Button>
      </div>

      <div className="absolute left-1/2 top-1/2 z-10 h-8 w-72 -translate-x-1/2 -translate-y-1/2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Rewind"
          onClick={onSeekRewind}
          className={cn(
            timelineIconButtonClassName,
            "absolute left-[calc(50%-2.25rem)] top-1/2 -translate-x-1/2 -translate-y-1/2"
          )}
        >
          <SkipBack className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={isPlaying ? "Pause" : "Play"}
          aria-pressed={isPlaying}
          onClick={onTogglePlayback}
          className={cn(
            timelineIconButtonClassName,
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          )}
        >
          {isPlaying ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 fill-current" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Forward"
          onClick={onSeekForward}
          className={cn(
            timelineIconButtonClassName,
            "absolute left-[calc(50%+2.25rem)] top-1/2 -translate-x-1/2 -translate-y-1/2"
          )}
        >
          <SkipForward className="size-4" />
        </Button>
        <div className="absolute left-[calc(50%+4.75rem)] top-1/2 flex -translate-y-1/2 items-center gap-2">
          <p className="font-medium text-foreground">{formatTimeLabel(currentTime)}</p>
          <p className="text-foreground-muted">/</p>
          <p className="font-medium text-foreground">
            {formatTimeLabel(timelineDurationSeconds)}
          </p>
        </div>
      </div>

      <div className="relative z-10 ml-auto flex items-center gap-2" aria-label="Timeline zoom">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Zoom out"
          disabled={zoomOutDisabled}
          onClick={onZoomOut}
          className={timelineIconButtonClassName}
        >
          <Minus className="size-4" />
        </Button>
        <div className="relative flex h-5 w-28 items-center">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={zoomPercent}
            aria-label="Timeline zoom level"
            onChange={(event) => onZoomSliderChange(Number(event.target.value))}
            className="h-5 w-full cursor-pointer appearance-none bg-transparent accent-foreground [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-foreground [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--foreground)_8%,transparent)]"
          />
          <span
            className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-foreground/25"
            style={{ width: `${zoomPercent}%` }}
          />
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Zoom in"
          disabled={zoomInDisabled}
          onClick={onZoomIn}
          className={timelineIconButtonClassName}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  )
}
