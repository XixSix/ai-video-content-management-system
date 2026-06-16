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
  return (
    <>
      <div
        className="pointer-events-none absolute inset-y-0 z-20 w-px bg-foreground/85 will-change-[left]"
        style={{ left: `${playheadPercent}%` }}
      >
        <span className="absolute left-1/2 top-0 -translate-x-1/2 rounded-md bg-foreground px-1.5 py-0.5 text-[11px] font-medium leading-none text-background">
          {formatRulerTimeLabel(currentTime)}
        </span>
      </div>

      <div className="relative h-8 border-b border-border/70 px-1 text-xs text-foreground-muted">
        <div className="absolute inset-x-0 top-4 h-px bg-border" />
        {minorTicks.map((tick) => (
          <span
            key={`minor-${tick}`}
            className="absolute top-[13px] h-1.5 w-px bg-border"
            style={{ left: `${(tick / timelineDurationSeconds) * 100}%` }}
          />
        ))}
        {majorTicks.map((tick) => (
          <span
            key={`major-${tick}`}
            className="absolute top-1 flex -translate-x-1/2 flex-col items-center gap-1"
            style={{ left: `${(tick / timelineDurationSeconds) * 100}%` }}
          >
            <span className="h-2 w-px bg-muted-foreground/35" />
            <span className="tabular-nums">{formatRulerTimeLabel(tick)}</span>
          </span>
        ))}
      </div>
    </>
  )
}
