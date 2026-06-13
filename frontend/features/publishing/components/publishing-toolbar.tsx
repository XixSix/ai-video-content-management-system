"use client"

import {
  CalendarDays,
  Check,
  ChevronDown,
  LayoutList,
  Search,
  SlidersHorizontal,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  publishPlatformFilterOptions,
  publishSortOptions,
  publishStatusFilterOptions,
} from "../publishing.data"
import type {
  PublishPlatformFilter,
  PublishSortKey,
  PublishStatusFilter,
  PublishViewMode,
} from "../publishing.types"
import { PublishingPlatformIcon } from "./publishing-platform-icon"

type PublishingToolbarProps = {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  statusFilter: PublishStatusFilter
  onStatusFilterChange: (value: PublishStatusFilter) => void
  platformFilter: PublishPlatformFilter
  onPlatformFilterChange: (value: PublishPlatformFilter) => void
  sortKey: PublishSortKey
  onSortKeyChange: (value: PublishSortKey) => void
  viewMode: PublishViewMode
  onViewModeChange: (value: PublishViewMode) => void
}

export function PublishingToolbar({
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  platformFilter,
  onPlatformFilterChange,
  sortKey,
  onSortKeyChange,
  viewMode,
  onViewModeChange,
}: PublishingToolbarProps) {
  const currentSortLabel =
    publishSortOptions.find((option) => option.value === sortKey)?.label ??
    "Newest"

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search title, caption, source, or hashtags..."
            className="h-10 rounded-xl pl-9"
          />
        </div>

        <div className="flex items-center gap-2 self-end lg:self-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="lg" className="px-3">
                <SlidersHorizontal className="size-4" />
                Sort: {currentSortLabel}
                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 min-w-52">
              <DropdownMenuRadioGroup
                value={sortKey}
                onValueChange={(value) =>
                  onSortKeyChange(value as PublishSortKey)
                }
              >
                {publishSortOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider>
            <div className="inline-flex items-center rounded-xl border border-border bg-background p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    className="rounded-lg"
                    onClick={() => onViewModeChange("list")}
                    aria-label="Switch to list view"
                  >
                    <LayoutList className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>List view</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant={viewMode === "calendar" ? "secondary" : "ghost"}
                    className="rounded-lg"
                    onClick={() => onViewModeChange("calendar")}
                    aria-label="Switch to calendar view"
                  >
                    <CalendarDays className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>Calendar view</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>

      <div className="space-y-3 overflow-x-auto pb-1">
        <div className="flex min-w-max flex-nowrap items-center gap-2">
          <span className="mr-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Status
          </span>
          {publishStatusFilterOptions.map((option) => {
            const isActive = option.value === statusFilter

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
                onClick={() => onStatusFilterChange(option.value)}
              >
                {isActive ? <Check className="size-3.5" /> : null}
                {option.label}
              </Button>
            )
          })}
        </div>

        <div className="flex min-w-max flex-nowrap items-center gap-2">
          <span className="mr-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Platform
          </span>
          {publishPlatformFilterOptions.map((option) => {
            const isActive = option.value === platformFilter

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
                onClick={() => onPlatformFilterChange(option.value)}
              >
                {option.value !== "ALL" ? (
                  <PublishingPlatformIcon platform={option.value} size={14} />
                ) : null}
                {option.label}
              </Button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
