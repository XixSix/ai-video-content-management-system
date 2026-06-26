import { Download, Eye, EyeOff, RotateCcw, Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import type { ExportTranscriptFormat } from "@/features/transcripts/transcript.types"

export function CaptionsToolbar({
  captionLayerEnabled,
  cueCount,
  filteredCueCount,
  isSearchOpen,
  language,
  onCloseSearch,
  onDownloadTranscript,
  onOpenSearch,
  onRegenerateCaptions,
  onSearchInputChange,
  onToggleCaptionLayer,
  isDownloading,
  isRegenerating,
  searchInput,
}: {
  captionLayerEnabled: boolean
  cueCount: number
  filteredCueCount: number
  isSearchOpen: boolean
  language: string
  onCloseSearch: () => void
  onDownloadTranscript: (format: ExportTranscriptFormat) => void
  onOpenSearch: () => void
  onRegenerateCaptions: () => void
  onSearchInputChange: (value: string) => void
  onToggleCaptionLayer: () => void
  isDownloading?: boolean
  isRegenerating?: boolean
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

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Regenerate captions"
                disabled={isRegenerating}
                onClick={onRegenerateCaptions}
              >
                <RotateCcw className={cn(isRegenerating && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Regenerate captions</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={
                  captionLayerEnabled ? "Hide captions" : "Show captions"
                }
                aria-pressed={captionLayerEnabled}
                onClick={onToggleCaptionLayer}
              >
                {captionLayerEnabled ? <Eye /> : <EyeOff />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {captionLayerEnabled ? "Hide captions" : "Show captions"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {!isSearchOpen ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Search captions"
                  onClick={onOpenSearch}
                >
                  <Search />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search captions</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}

        <DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Download transcript"
                    disabled={isDownloading}
                  >
                    <Download />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Download transcript</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onDownloadTranscript("srt")}>
              SRT export
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownloadTranscript("vtt")}>
              VTT export
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownloadTranscript("txt")}>
              TXT export
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownloadTranscript("json")}>
              JSON export
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
