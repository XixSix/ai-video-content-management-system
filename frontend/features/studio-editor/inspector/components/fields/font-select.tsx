import { Check, ChevronDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getFontPreviewStyle } from "@/features/studio-editor/inspector/lib/style-preview"

export function FontSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  value: string | undefined
}) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0]

  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-left text-sm font-medium text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            style={getFontPreviewStyle(selectedOption.value)}
          >
            <span className="truncate">{selectedOption.label}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-border bg-background p-1"
        >
          {options.map((option) => {
            const isSelected = option.value === selectedOption.value

            return (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => onChange(option.value)}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={getFontPreviewStyle(option.value)}
              >
                <span>{option.label}</span>
                {isSelected ? <Check className="size-4 text-foreground" /> : null}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
