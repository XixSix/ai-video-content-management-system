import { useEffect, useRef, useState } from "react"

const COLOR_COMMIT_DELAY_MS = 80
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

export function ColorField({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: string) => void
  value: string
}) {
  const [draftValue, setDraftValue] = useState(value)
  const [isDrafting, setIsDrafting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    },
    []
  )

  const commitValue = (nextValue: string, options?: { immediate?: boolean }) => {
    setDraftValue(nextValue)
    setIsDrafting(true)

    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (options?.immediate) {
      onChange(nextValue)
      setIsDrafting(false)
      return
    }

    timerRef.current = setTimeout(() => {
      onChange(nextValue)
      timerRef.current = null
    }, COLOR_COMMIT_DELAY_MS)
  }
  const displayValue = isDrafting ? draftValue : value
  const colorInputValue = HEX_COLOR_PATTERN.test(displayValue)
    ? displayValue
    : HEX_COLOR_PATTERN.test(value)
      ? value
      : "#000000"

  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-2">
        <label className="relative flex h-10 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
          <input
            type="color"
            value={colorInputValue}
            onChange={(event) => commitValue(event.target.value)}
            onBlur={(event) =>
              commitValue(event.currentTarget.value, { immediate: true })
            }
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <span
            className="size-7 rounded-lg border border-white/10"
            style={{ backgroundColor: displayValue }}
          />
        </label>
        <input
          type="text"
          value={displayValue}
          onChange={(event) => commitValue(event.target.value)}
          onBlur={(event) =>
            commitValue(event.currentTarget.value, { immediate: true })
          }
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30"
        />
      </div>
    </div>
  )
}
