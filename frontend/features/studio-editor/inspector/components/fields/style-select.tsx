import { ChevronDown } from "lucide-react"

import { getFontPreviewStyle } from "@/features/studio-editor/inspector/lib/style-preview"

export function StyleSelect({
  label,
  onChange,
  options,
  previewFont,
  value,
}: {
  label: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  previewFont?: boolean
  value: string | undefined
}) {
  return (
    <label className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-xl border border-border bg-background px-3 pr-10 text-sm font-medium text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30"
          style={previewFont ? getFontPreviewStyle(value) : undefined}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </label>
  )
}
