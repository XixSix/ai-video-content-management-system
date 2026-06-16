export function SliderField({
  label,
  max,
  min,
  onChange,
  step = 1,
  suffix,
  value,
}: {
  label: string
  max: number
  min: number
  onChange: (value: number) => void
  step?: number
  suffix: string
  value: number
}) {
  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3">
        <div className="flex h-10 items-center rounded-xl border border-border bg-background px-3">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            className="w-full bg-transparent text-sm font-medium text-foreground outline-none"
          />
          <span className="ml-2 text-xs font-medium text-muted-foreground">
            {suffix}
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-foreground"
        />
      </div>
    </div>
  )
}
