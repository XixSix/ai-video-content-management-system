import { Download, RotateCcw, Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function CaptionsToolbar({
  cueCount,
  filteredCueCount,
  isSearchOpen,
  language,
  onCloseSearch,
  onDiscardChanges,
  onOpenSearch,
  onSearchInputChange,
  searchInput,
}: {
  cueCount: number
  filteredCueCount: number
  isSearchOpen: boolean
  language: string
  onCloseSearch: () => void
  onDiscardChanges: () => void
  onOpenSearch: () => void
  onSearchInputChange: (value: string) => void
  searchInput: string
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border/80 px-4 py-3">
      <div className={cn("flex min-w-0 items-center gap-2", isSearchOpen ? "shrink-0" : "flex-1")}>
        <Badge variant="neutral">{language}</Badge>
      </div>

      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1.5">
        {isSearchOpen ? (
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              autoFocus
              onChange={(event) => onSearchInputChange(event.target.value)}
              aria-label="Search captions"
              placeholder="Search"
              className="h-8 rounded-full border-border/80 bg-background/80 pl-8 pr-16 text-sm shadow-sm"
            />
            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
              <span className="font-mono text-[11px] text-muted-foreground">
                {filteredCueCount}/{cueCount}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Close search"
                className="rounded-full"
                onClick={onCloseSearch}
              >
                <X className="size-3" />
              </Button>
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Regenerate captions"
          onClick={onDiscardChanges}
        >
          <RotateCcw />
        </Button>

        {!isSearchOpen ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Open caption search"
            onClick={onOpenSearch}
          >
            <Search />
          </Button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Download captions"
            >
              <Download />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>SRT export</DropdownMenuItem>
            <DropdownMenuItem>VTT export</DropdownMenuItem>
            <DropdownMenuItem>TXT export</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
