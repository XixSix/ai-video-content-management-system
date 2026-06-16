import { cn } from "@/lib/utils"

import { mediaFilters } from "../lib/media-display"
import type { MediaFilter } from "../lib/media-display"

export function MediaFilterTabs({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: MediaFilter
  onFilterChange: (filter: MediaFilter) => void
}) {
  return (
    <div className="mt-5 grid grid-cols-4 border-b border-border">
      {mediaFilters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onFilterChange(filter.value)}
          className={cn(
            "relative h-9 text-xs font-medium transition",
            activeFilter === filter.value
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {filter.label}
          {activeFilter === filter.value ? (
            <span className="absolute inset-x-1 bottom-0 h-px bg-foreground" />
          ) : null}
        </button>
      ))}
    </div>
  )
}
