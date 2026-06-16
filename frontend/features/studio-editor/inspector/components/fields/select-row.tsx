import { ChevronDown } from "lucide-react"

export function SelectRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)_3.5rem] items-center gap-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <button
        type="button"
        className="flex h-8 min-w-0 items-center justify-between rounded-lg border border-border bg-background px-2 text-left text-xs font-medium text-foreground"
      >
        <span className="truncate">None</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>
      <span className="rounded-lg border border-border bg-background px-2 py-1 text-right text-xs font-medium text-muted-foreground">
        {value}
      </span>
    </div>
  )
}
