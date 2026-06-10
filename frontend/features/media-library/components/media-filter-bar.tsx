import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type {
  FilterChipOption,
  MediaStatusFilter,
  MediaTypeFilter,
} from "../media-library.types"

type MediaFilterBarProps = {
  typeFilter: MediaTypeFilter
  onTypeFilterChange: (value: MediaTypeFilter) => void
  statusFilter: MediaStatusFilter
  onStatusFilterChange: (value: MediaStatusFilter) => void
  typeOptions: FilterChipOption<MediaTypeFilter>[]
  statusOptions: FilterChipOption<MediaStatusFilter>[]
}

type FilterGroupProps<TValue extends string> = {
  label: string
  value: TValue
  onValueChange: (value: TValue) => void
  options: FilterChipOption<TValue>[]
}

function FilterGroup<TValue extends string>({
  label,
  value,
  onValueChange,
  options,
}: FilterGroupProps<TValue>) {
  return (
    <div className="flex min-w-max items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-nowrap gap-2">
        {options.map((option) => {
          const isActive = option.value === value

          return (
            <Button
              key={option.value}
              type="button"
              variant={isActive ? "secondary" : "outline"}
              size="sm"
              className={cn(
                "rounded-full px-3",
                isActive && "shadow-[inset_0_0_0_1px_var(--border)]"
              )}
              onClick={() => onValueChange(option.value)}
            >
              {option.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export function MediaFilterBar({
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  typeOptions,
  statusOptions,
}: MediaFilterBarProps) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max flex-nowrap gap-5">
        <FilterGroup
          label="Type"
          value={typeFilter}
          onValueChange={onTypeFilterChange}
          options={typeOptions}
        />
        <FilterGroup
          label="Status"
          value={statusFilter}
          onValueChange={onStatusFilterChange}
          options={statusOptions}
        />
      </div>
    </div>
  )
}
