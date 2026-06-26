import { cn } from "@/lib/utils"
import type {
  FilterChipOption,
  MediaLibraryTab,
} from "../types/media-library.types"

type MediaLibraryTabsProps = {
  activeTab: MediaLibraryTab
  options: FilterChipOption<MediaLibraryTab>[]
  onTabChange: (value: MediaLibraryTab) => void
}

export function MediaLibraryTabs({
  activeTab,
  options,
  onTabChange,
}: MediaLibraryTabsProps) {
  return (
    <div className="overflow-x-auto border-b border-border/70">
      <div className="flex min-w-max gap-6">
        {options.map((option) => {
          const isActive = option.value === activeTab

          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                "relative pb-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground",
                isActive && "text-foreground"
              )}
              onClick={() => onTabChange(option.value)}
            >
              {option.label}
              {isActive ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-foreground" />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
