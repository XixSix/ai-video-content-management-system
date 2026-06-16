import { buildFallbackPeaks } from "@/features/studio-editor/timeline/hooks/use-audio-peaks"
import { cn } from "@/lib/utils"

export function TimelineWaveform({
  barCount,
  className,
  peaks,
  seed = 17,
}: {
  barCount: number
  className: string
  peaks?: number[] | null
  seed?: number
}) {
  const bars = peaks ?? buildFallbackPeaks(barCount, seed)

  return (
    <div className="flex h-full w-full items-end gap-px px-1">
      {bars.map((peak, barIndex) => (
        <span
          key={barIndex}
          className={cn("min-w-px flex-1 rounded-t-[1px]", className)}
          style={{
            height: `${Math.round(12 + peak * 88)}%`,
          }}
        />
      ))}
    </div>
  )
}
