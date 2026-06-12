"use client"

import { useEffect, useRef, useState } from "react"
import { Download, RotateCcw, Search, X } from "lucide-react"

import {
  buildCaptionCues,
  formatCaptionTimestamp,
} from "@/features/studio-editor/studio-captions"
import { useStudioEditor } from "@/features/studio-editor/studio-editor-context"
import { StudioPanelShell } from "@/features/studio-editor/components/studio-panel-shell"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

const SEARCH_DEBOUNCE_MS = 220

function isCueActive(
  cue: ReturnType<typeof buildCaptionCues>[number],
  currentTime: number
) {
  return currentTime >= cue.startTime && currentTime <= cue.endTime
}

function isWordGroupActive(
  wordGroup: ReturnType<typeof buildCaptionCues>[number]["wordGroups"][number],
  currentTime: number
) {
  return currentTime >= wordGroup.startTime && currentTime <= wordGroup.endTime
}

export function CaptionsPanel() {
  const {
    commitTranscriptWordText,
    currentTime,
    discardTranscriptChanges,
    project,
    seekToTime,
    selectTranscriptSegment,
  } = useStudioEditor()
  const [editingWordId, setEditingWordId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const activeCueRef = useRef<HTMLDivElement | null>(null)

  const cues = buildCaptionCues(project.transcriptSegments, project.transcriptWords)
  const query = search.trim().toLowerCase()
  const filteredCues = cues.filter((cue) => {
    if (!query) {
      return true
    }

    return (
      cue.speakerLabel.toLowerCase().includes(query) ||
      cue.wordGroups.some((group) => group.text.toLowerCase().includes(query))
    )
  })
  const activeCueId =
    filteredCues.find((cue) => isCueActive(cue, currentTime))?.id ??
    cues.find((cue) => isCueActive(cue, currentTime))?.id

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput)
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchInput])

  useEffect(() => {
    if (!activeCueRef.current) {
      return
    }

    activeCueRef.current.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    })
  }, [activeCueId])

  const commitEditingWord = () => {
    if (!editingWordId) {
      return
    }

    commitTranscriptWordText(editingWordId, editingText)
    setEditingWordId(null)
    setEditingText("")
  }

  const cancelEditingWord = () => {
    setEditingWordId(null)
    setEditingText("")
  }

  return (
    <StudioPanelShell title="Captions">
      <div className="flex min-h-0 flex-1 flex-col bg-background">
        <div className="flex items-center gap-2 border-b border-border/80 px-4 py-3">
          <div className={cn("flex min-w-0 items-center gap-2", isSearchOpen ? "shrink-0" : "flex-1")}>
            <Badge variant="neutral">{project.transcript.language}</Badge>
          </div>

          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1.5">
            {isSearchOpen ? (
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  autoFocus
                  onChange={(event) => setSearchInput(event.target.value)}
                  aria-label="Search captions"
                  placeholder="Search"
                  className="h-8 rounded-full border-border/80 bg-background/80 pl-8 pr-16 text-sm shadow-sm"
                />
                <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {filteredCues.length}/{cues.length}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Close search"
                    className="rounded-full"
                    onClick={() => {
                      setSearchInput("")
                      setSearch("")
                      setIsSearchOpen(false)
                    }}
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
              onClick={() => {
                cancelEditingWord()
                discardTranscriptChanges()
              }}
            >
              <RotateCcw />
            </Button>

            {!isSearchOpen ? (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Open caption search"
                onClick={() => setIsSearchOpen(true)}
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

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {filteredCues.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-muted/40 px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">No captions match this search.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try speaker names or a phrase from the current transcript.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCues.map((cue) => {
                const cueIsActive = cue.id === activeCueId

                return (
                  <div
                    key={cue.id}
                    ref={cueIsActive ? activeCueRef : null}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      selectTranscriptSegment(cue.sourceSegmentIds[0])
                      seekToTime(cue.startTime)
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") {
                        return
                      }

                      event.preventDefault()
                      selectTranscriptSegment(cue.sourceSegmentIds[0])
                      seekToTime(cue.startTime)
                    }}
                    className={cn(
                      "group w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-3 text-left outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                      cueIsActive
                        ? "border-foreground/20 bg-muted/45"
                        : "hover:border-foreground/15 hover:bg-surface-muted/35"
                    )}
                  >
                    <div className="grid grid-cols-[auto_1px_minmax(0,1fr)] gap-3">
                      <div className="flex min-w-[116px] items-center gap-2 self-start rounded-md border border-border bg-muted/45 px-2 py-1.5">
                        <Avatar size="sm">
                          <AvatarFallback>
                            {cue.speakerLabel.replace("Speaker ", "S")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-foreground">
                            {cue.speakerLabel}
                          </p>
                        </div>
                      </div>

                      <div className="w-px self-stretch bg-border/80" />

                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                            {formatCaptionTimestamp(cue.startTime)}
                          </p>
                          {cue.wordGroups.some((group) => group.isEdited) ? (
                            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Edited
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-1 gap-y-1.5">
                          {cue.wordGroups.map((wordGroup) => {
                            const wordIsActive = isWordGroupActive(wordGroup, currentTime)
                            const wordIsEditing = editingWordId === wordGroup.sourceWordId

                            if (wordIsEditing) {
                              return (
                                <Input
                                  key={wordGroup.id}
                                  value={editingText}
                                  autoFocus
                                  onChange={(event) => setEditingText(event.target.value)}
                                  onBlur={commitEditingWord}
                                  onClick={(event) => event.stopPropagation()}
                                  onKeyDown={(event) => {
                                    event.stopPropagation()

                                    if (event.key === "Enter") {
                                      event.preventDefault()
                                      commitEditingWord()
                                    }

                                    if (event.key === "Escape") {
                                      event.preventDefault()
                                      cancelEditingWord()
                                    }
                                  }}
                                  className="h-7 min-w-24 max-w-56 rounded-md border-border/80 bg-background/90 px-2 text-xs shadow-sm"
                                />
                              )
                            }

                            return (
                              <button
                                key={wordGroup.id}
                                type="button"
                                data-active={wordIsActive}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setEditingWordId(wordGroup.sourceWordId)
                                  setEditingText(wordGroup.text)
                                }}
                                onKeyDown={(event) => event.stopPropagation()}
                                className={cn(
                                  "rounded-md px-1.5 py-0.5 text-left text-[15px] leading-6 text-foreground/90 transition hover:bg-foreground/6",
                                  cueIsActive ? "text-foreground" : null,
                                  wordGroup.isEdited ? "ring-1 ring-amber-500/18" : null,
                                  wordGroup.isOmitted
                                    ? "border border-dashed border-border/70 text-[11px] text-muted-foreground"
                                    : null,
                                  "data-[active=true]:bg-foreground/10 data-[active=true]:text-foreground"
                                )}
                              >
                                {wordGroup.isOmitted ? "Removed" : wordGroup.text}
                              </button>
                            )
                          })}
                        </div>

                        <p className="mt-2 font-mono text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                          {formatCaptionTimestamp(cue.endTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </StudioPanelShell>
  )
}
