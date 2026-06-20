"use client"

import { Check, ChevronsUpDown, Search } from "lucide-react"

import {
  studioProjectSortOptions,
  studioProjectStatusOptions,
} from "@/features/studio-hub/studio-projects.data"
import type {
  ProjectStatus,
  StudioProjectSortKey,
} from "@/features/studio-hub/studio-projects.types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

type StudioProjectToolbarProps = {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  statusFilter: ProjectStatus | "ALL"
  onStatusFilterChange: (value: ProjectStatus | "ALL") => void
  sortKey: StudioProjectSortKey
  onSortKeyChange: (value: StudioProjectSortKey) => void
}

export function StudioProjectToolbar({
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  sortKey,
  onSortKeyChange,
}: StudioProjectToolbarProps) {
  const currentStatusLabel =
    studioProjectStatusOptions.find((option) => option.value === statusFilter)
      ?.label ?? "All projects"
  const currentSortLabel =
    studioProjectSortOptions.find((option) => option.value === sortKey)?.label ??
    "Most recent"

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search projects or source media"
          className="h-10 rounded-lg pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {currentStatusLabel}
              <ChevronsUpDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {studioProjectStatusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onStatusFilterChange(option.value)}
              >
                <span className="flex-1">{option.label}</span>
                {statusFilter === option.value ? (
                  <Check className="size-4 text-foreground" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {currentSortLabel}
              <ChevronsUpDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {studioProjectSortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onSortKeyChange(option.value)}
              >
                <span className="flex-1">{option.label}</span>
                {sortKey === option.value ? (
                  <Check className="size-4 text-foreground" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
