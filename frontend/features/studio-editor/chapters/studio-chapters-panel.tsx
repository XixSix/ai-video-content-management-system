"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  Download,
  Eye,
  EyeOff,
  LoaderCircle,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { isTerminalJob, jobService } from "@/features/jobs/job.service"
import {
  useGenerateChapters,
  useMediaChapters,
} from "@/features/chapters/use-chapters"
import { useMediaTranscripts } from "@/features/transcripts/use-transcripts"
import {
  useStudioPlaybackState,
  useStudioProjectActions,
  useStudioProjectState,
  useStudioSelectionState,
} from "@/features/studio-editor/store/studio-editor-store"
import { StudioPanelShell } from "@/features/studio-editor/tool-panel/components/studio-panel-shell"

import { ChapterList } from "./components/chapter-list"
import { getCurrentChapterId } from "./lib/chapter-display"

function getSourceMediaId(project: ReturnType<typeof useStudioProjectState>["project"]) {
  const sourceProjectMedia = project.projectMedia.find(
    (item) => item.origin === "SOURCE"
  )
  const mediaId =
    sourceProjectMedia?.sourceLibraryItemId ??
    sourceProjectMedia?.id ??
    project.media.id ??
    project.sourceMedia.id

  return mediaId && !mediaId.startsWith("project-") ? mediaId : null
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function StudioChaptersPanel() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isChapterListVisible, setIsChapterListVisible] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const { currentTime } = useStudioPlaybackState()
  const { hydrateProjectAiOutputs } = useStudioProjectActions()
  const { project } = useStudioProjectState()
  const { selectChapter, selectedChapterId } = useStudioSelectionState()
  const sourceMediaId = getSourceMediaId(project)
  const chaptersQuery = useMediaChapters(sourceMediaId)
  const transcriptsQuery = useMediaTranscripts(sourceMediaId)
  const latestTranscript = transcriptsQuery.data?.transcripts[0] ?? null
  const generateChapters = useGenerateChapters(sourceMediaId)
  const jobSubscriptionRef = useRef<{ close: () => void } | null>(null)
  const chapters = [...project.chapters].sort(
    (left, right) => left.chapterIndex - right.chapterIndex
  )
  const filteredChapters = searchInput.trim()
    ? chapters.filter((chapter) => {
        const query = searchInput.trim().toLowerCase()

        return (
          chapter.title.toLowerCase().includes(query) ||
          chapter.summary.toLowerCase().includes(query)
        )
      })
    : chapters
  const currentChapterId = getCurrentChapterId(chapters, currentTime)

  useEffect(() => {
    if (!chaptersQuery.data?.chapters) {
      return
    }

    hydrateProjectAiOutputs({ chapters: chaptersQuery.data.chapters })
  }, [chaptersQuery.data?.chapters, hydrateProjectAiOutputs])

  useEffect(
    () => () => {
      jobSubscriptionRef.current?.close()
    },
    []
  )

  const trackGenerationJob = (jobId: string) => {
    jobSubscriptionRef.current?.close()
    jobSubscriptionRef.current = jobService.subscribeToJobEvents({
      jobId,
      onError: () => {
        jobSubscriptionRef.current?.close()
        jobSubscriptionRef.current = null
      },
      onJob: (job) => {
        if (!isTerminalJob(job)) {
          return
        }

        jobSubscriptionRef.current?.close()
        jobSubscriptionRef.current = null
        if (job.status === "COMPLETED") {
          toast.success("Chapters are ready")
          void chaptersQuery.refetch()
          return
        }

        toast.error("Chapter generation failed", {
          description: job.errorMessage ?? job.errorCode ?? "Please try again.",
        })
      },
    })
  }

  const regenerateChapters = async () => {
    if (!sourceMediaId) {
      toast.error("No source media found")
      return
    }

    if (transcriptsQuery.isLoading) {
      toast.info("Checking transcript first")
      return
    }

    if (!latestTranscript) {
      toast.error("Transcript required", {
        description: "Generate captions before generating chapters.",
      })
      return
    }

    try {
      const { job } = await generateChapters.mutateAsync({})
      toast.success("Chapter generation started")
      trackGenerationJob(job.id)
    } catch (error) {
      toast.error("Could not start chapter generation", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  const downloadChapters = async () => {
    if (!sourceMediaId) {
      toast.error("No source media found")
      return
    }

    if (chapters.length === 0) {
      toast.error("No chapters to download", {
        description: "Generate chapters before downloading them.",
      })
      return
    }

    try {
      const result = await chaptersQuery.refetch()
      const apiChapters = result.data?.chapters ?? []

      downloadJson(`chapters-${sourceMediaId}.json`, {
        chapters: apiChapters,
        mediaId: sourceMediaId,
      })
      toast.success("Chapters downloaded")
    } catch (error) {
      toast.error("Could not download chapters", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  const isLoadingChapters = chaptersQuery.isLoading

  return (
    <StudioPanelShell title="Chapters">
      <div className="flex min-h-0 flex-1 flex-col bg-background">
        <div className="flex items-center gap-2 border-b border-border/80 px-4 py-3">
          {isSearchOpen ? (
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                autoFocus
                onChange={(event) => setSearchInput(event.target.value)}
                aria-label="Search chapters"
                placeholder="Search chapters"
                className="h-8 rounded-full border-border/80 bg-background/80 pl-8 pr-16 text-sm shadow-sm"
              />
              <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {filteredChapters.length}/{chapters.length}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Close chapter search"
                  className="rounded-full"
                  onClick={() => {
                    setIsSearchOpen(false)
                    setSearchInput("")
                  }}
                >
                  <X className="size-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 text-xs text-muted-foreground">
              {chapters.length} chapters
            </div>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Regenerate chapters"
                  disabled={generateChapters.isPending}
                  onClick={() => {
                    void regenerateChapters()
                  }}
                >
                  <RotateCcw
                    className={generateChapters.isPending ? "animate-spin" : ""}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Regenerate chapters</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={
                    isChapterListVisible ? "Hide chapters" : "Show chapters"
                  }
                  aria-pressed={isChapterListVisible}
                  onClick={() =>
                    setIsChapterListVisible((currentValue) => !currentValue)
                  }
                >
                  {isChapterListVisible ? <Eye /> : <EyeOff />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isChapterListVisible ? "Hide chapters" : "Show chapters"}
              </TooltipContent>
            </Tooltip>

            {!isSearchOpen ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Search chapters"
                    onClick={() => setIsSearchOpen(true)}
                  >
                    <Search />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search chapters</TooltipContent>
              </Tooltip>
            ) : null}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Download chapters"
                  onClick={() => {
                    void downloadChapters()
                  }}
                >
                  <Download />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download chapters</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {isLoadingChapters ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 size-4 animate-spin" />
            Loading chapters...
          </div>
        ) : chaptersQuery.isError ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <div className="max-w-xs">
              <AlertTriangle className="mx-auto size-6 text-destructive" />
              <p className="mt-3 text-sm font-semibold text-foreground">
                Could not load chapters
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {chaptersQuery.error instanceof Error
                  ? chaptersQuery.error.message
                  : "Please try again."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  void chaptersQuery.refetch()
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : chapters.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <div className="max-w-xs">
              <p className="text-sm font-semibold text-foreground">
                No chapters yet
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Generate chapters for this source media before reviewing or
                publishing chapter markers.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-4"
                disabled={generateChapters.isPending}
                onClick={() => {
                  void regenerateChapters()
                }}
              >
                {generateChapters.isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Sparkles />
                )}
                Generate with AI
              </Button>
            </div>
          </div>
        ) : isChapterListVisible ? (
          <ChapterList
            chapters={filteredChapters}
            currentChapterId={currentChapterId}
            onSelectChapter={selectChapter}
            selectedChapterId={selectedChapterId}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Chapters are hidden.
          </div>
        )}
      </div>
    </StudioPanelShell>
  )
}
