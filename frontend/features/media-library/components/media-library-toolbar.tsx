"use client"

import { Grid2X2, List, Search, SlidersHorizontal } from "lucide-react"

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
import type {
  MediaLibrarySortKey,
  MediaLibraryViewMode,
  SortOption,
} from "../types/media-library.types"

type MediaLibraryToolbarProps = {
  searchQuery: string
  onSearchChange: (value: string) => void
  sortKey: MediaLibrarySortKey
  onSortChange: (value: MediaLibrarySortKey) => void
  sortOptions: SortOption[]
  viewMode: MediaLibraryViewMode
  onViewModeChange: (value: MediaLibraryViewMode) => void
}

export function MediaLibraryToolbar({
  searchQuery,
  onSearchChange,
  sortKey,
  onSortChange,
  sortOptions,
  viewMode,
  onViewModeChange,
}: MediaLibraryToolbarProps) {
  const currentSortLabel =
    sortOptions.find((option) => option.value === sortKey)?.label ?? "Newest"

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search source media..."
          className="h-10 rounded-xl pl-9"
        />
      </div>

      <div className="flex items-center gap-2 self-end lg:self-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="lg" className="px-3">
              <SlidersHorizontal className="size-4" />
              Sort: {currentSortLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 min-w-48">
            <DropdownMenuRadioGroup
              value={sortKey}
              onValueChange={(value) => onSortChange(value as MediaLibrarySortKey)}
            >
              {sortOptions.map((option) => (
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
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  className="rounded-lg"
                  onClick={() => onViewModeChange("grid")}
                  aria-label="Switch to grid view"
                >
                  <Grid2X2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>Grid view</TooltipContent>
            </Tooltip>
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
                  <List className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>List view</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </div>
  )
}

