import { formatRulerTimeLabel } from "@/features/studio-editor/timeline/lib/time"

export function TimelineRuler({
  currentTime,
  majorTicks,
  minorTicks,
  playheadPercent,
  timelineDurationSeconds,
}: {
  currentTime: number
  majorTicks: number[]
  minorTicks: number[]
  playheadPercent: number
  timelineDurationSeconds: number
}) {
  const playheadBubbleClassName =
    playheadPercent < 4
      ? "left-0 translate-x-0"
      : playheadPercent > 96
        ? "right-0 translate-x-0"
        : "left-1/2 -translate-x-1/2"

  return (
    <>
      <div
        className="pointer-events-none absolute inset-y-0 z-30 w-px bg-foreground/90 shadow-[0_0_0_1px_color-mix(in_srgb,var(--background)_55%,transparent)] will-change-[left]"
        style={{ left: `${playheadPercent}%` }}
      >
        <span
          className={`absolute top-0 rounded-md bg-foreground px-1.5 py-0.5 text-[11px] font-semibold leading-none text-background shadow-sm ${playheadBubbleClassName}`}
        >
          {formatRulerTimeLabel(currentTime)}
        </span>
      </div>

      <div className="relative h-8 border-b border-border/70 px-1 text-xs text-foreground-muted">
        <div className="absolute inset-x-0 top-4 h-px bg-border/90" />
        {minorTicks.map((tick) => (
          <span
            key={`minor-${tick}`}
            className="absolute top-[13px] h-1.5 w-px bg-border/80"
            style={{ left: `${(tick / timelineDurationSeconds) * 100}%` }}
          />
        ))}
        {majorTicks.map((tick) => (
          <span
            key={`major-${tick}`}
            className="absolute top-1 flex -translate-x-1/2 flex-col items-center gap-1"
            style={{ left: `${(tick / timelineDurationSeconds) * 100}%` }}
          >
            <span className="h-2 w-px bg-muted-foreground/45" />
            <span className="tabular-nums tracking-normal">
              {formatRulerTimeLabel(tick)}
            </span>
          </span>
        ))}
      </div>
    </>
  )
}
