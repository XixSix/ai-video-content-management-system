import type { ReactNode } from "react"

export function ControlRow({
  control,
  label,
  value,
}: {
  control?: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)_3.5rem] items-center gap-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex min-w-0 items-center gap-3">
        {control ? <div className="shrink-0">{control}</div> : null}
        <div className="relative h-1 min-w-0 flex-1 rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-foreground/85"
            style={{
              width:
                value === "100 %" ? "62%" : value === "1.0 x" ? "34%" : "3%",
            }}
          />
          <div
            className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-foreground"
            style={{
              left:
                value === "100 %" ? "62%" : value === "1.0 x" ? "34%" : "3%",
            }}
          />
        </div>
      </div>
      <span className="rounded-lg border border-border bg-background px-2 py-1 text-right text-xs font-medium text-foreground">
        {value}
      </span>
    </div>
  )
}
