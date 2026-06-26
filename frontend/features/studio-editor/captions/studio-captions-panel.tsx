"use client"

import { useEffect, useRef } from "react"
import { AlertTriangle, LoaderCircle, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { isTerminalJob, jobService } from "@/features/jobs/job.service"
import { buildCaptionCues } from "@/features/studio-editor/lib/caption-cues"
import { StudioPanelShell } from "@/features/studio-editor/tool-panel/components/studio-panel-shell"
import {
  useStudioPlaybackState,
  useStudioLayerActions,
  useStudioProjectActions,
  useStudioProjectState,
  useStudioSelectionState,
  useStudioTranscriptActions,
} from "@/features/studio-editor/store/studio-editor-store"
import type { StudioCaptionCue } from "@/features/studio-editor/studio.types"
import {
  useExportTranscript,
  useGenerateTranscript,
  useMediaTranscripts,
  useTranscriptEditor,
} from "@/features/transcripts/use-transcripts"
import type { ExportTranscriptFormat } from "@/features/transcripts/transcript.types"

import { CaptionCueList } from "./components/caption-cue-list"
import { CaptionsToolbar } from "./components/captions-toolbar"
import { useActiveCaptionScroll } from "./hooks/use-active-caption-scroll"
import { useCaptionSearch } from "./hooks/use-caption-search"
import { useCaptionWordEdit } from "./hooks/use-caption-word-edit"

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

export function StudioCaptionsPanel() {
  const { commitTranscriptWordText, discardTranscriptChanges } =
    useStudioTranscriptActions()
  const { updateCaptionLayerStyle } = useStudioLayerActions()
  const { hydrateProjectAiOutputs } = useStudioProjectActions()
  const { currentTime, seekToTime } = useStudioPlaybackState()
  const { project } = useStudioProjectState()
  const { selectTranscriptSegment } = useStudioSelectionState()
  const sourceMediaId = getSourceMediaId(project)
  const transcriptsQuery = useMediaTranscripts(sourceMediaId)
  const latestTranscript = transcriptsQuery.data?.transcripts[0] ?? null
  const transcriptEditorQuery = useTranscriptEditor(latestTranscript?.id)
  const generateTranscript = useGenerateTranscript(sourceMediaId)
  const exportTranscript = useExportTranscript(latestTranscript?.id)
  const jobSubscriptionRef = useRef<{ close: () => void } | null>(null)
  const captionLayer = project.layers.find((layer) => layer.kind === "captions")
  const captionLayerEnabled = captionLayer?.enabled ?? true
  const cues = buildCaptionCues(project.transcriptSegments, project.transcriptWords)
  const {
    activeCueId,
    closeSearch,
    filteredCues,
    isSearchOpen,
    searchInput,
    setIsSearchOpen,
    setSearchInput,
  } = useCaptionSearch({
    cues,
    currentTime,
  })
  const activeCueRef = useActiveCaptionScroll(activeCueId)
  const {
    cancelEditingWord,
    commitEditingWord,
    editingText,
    editingWordId,
    setEditingText,
    startEditingWord,
  } = useCaptionWordEdit({
    onCommitWordText: commitTranscriptWordText,
  })

  useEffect(() => {
    if (!transcriptEditorQuery.data || !latestTranscript) {
      return
    }

    hydrateProjectAiOutputs({
      transcript: latestTranscript,
      transcriptEditor: transcriptEditorQuery.data,
    })
  }, [hydrateProjectAiOutputs, latestTranscript, transcriptEditorQuery.data])

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
          toast.success("Transcript is ready")
          void transcriptsQuery.refetch()
          return
        }

        toast.error("Transcript generation failed", {
          description: job.errorMessage ?? "Please try again.",
        })
      },
    })
  }

  const regenerateCaptions = async () => {
    if (!sourceMediaId) {
      toast.error("No source media found")
      return
    }

    try {
      cancelEditingWord()
      discardTranscriptChanges()
      const { job } = await generateTranscript.mutateAsync({})
      toast.success("Transcript generation started")
      trackGenerationJob(job.id)
    } catch (error) {
      toast.error("Could not start transcript generation", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  const downloadTranscript = async (format: ExportTranscriptFormat) => {
    if (!latestTranscript?.id) {
      toast.error("Transcript required", {
        description: "Generate captions before downloading a transcript.",
      })
      return
    }

    try {
      const { job } = await exportTranscript.mutateAsync({ format })
      toast.success("Transcript export started", {
        description: `${format.toUpperCase()} export job ${job.id.slice(0, 8)}`,
      })
    } catch (error) {
      toast.error("Could not export transcript", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  const selectCue = (cue: StudioCaptionCue) => {
    selectTranscriptSegment(cue.sourceSegmentIds[0])
    seekToTime(cue.startTime)
  }

  const isLoadingTranscript =
    transcriptsQuery.isLoading ||
    (Boolean(latestTranscript?.id) && transcriptEditorQuery.isLoading)
  const loadError = transcriptsQuery.error ?? transcriptEditorQuery.error

  return (
    <StudioPanelShell title="Captions">
      <div className="flex min-h-0 flex-1 flex-col bg-background">
        <CaptionsToolbar
          captionLayerEnabled={captionLayerEnabled}
          cueCount={cues.length}
          filteredCueCount={filteredCues.length}
          isDownloading={exportTranscript.isPending}
          isRegenerating={generateTranscript.isPending}
          isSearchOpen={isSearchOpen}
          language={project.transcript.language}
          onCloseSearch={closeSearch}
          onDownloadTranscript={(format) => {
            void downloadTranscript(format)
          }}
          onOpenSearch={() => setIsSearchOpen(true)}
          onRegenerateCaptions={() => {
            void regenerateCaptions()
          }}
          onSearchInputChange={setSearchInput}
          onToggleCaptionLayer={() =>
            updateCaptionLayerStyle({ enabled: !captionLayerEnabled })
          }
          searchInput={searchInput}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {isLoadingTranscript ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 size-4 animate-spin" />
              Loading captions...
            </div>
          ) : loadError ? (
            <div className="flex h-full items-center justify-center px-4 text-center">
              <div className="max-w-xs">
                <AlertTriangle className="mx-auto size-6 text-destructive" />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  Could not load captions
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {loadError instanceof Error
                    ? loadError.message
                    : "Please try again."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    void transcriptsQuery.refetch()
                  }}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : !latestTranscript ? (
            <div className="flex h-full items-center justify-center px-4 text-center">
              <div className="max-w-xs">
                <p className="text-sm font-semibold text-foreground">
                  No captions yet
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Generate a transcript for this source media to start editing
                  captions.
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-4"
                  disabled={generateTranscript.isPending}
                  onClick={() => {
                    void regenerateCaptions()
                  }}
                >
                  {generateTranscript.isPending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Sparkles />
                  )}
                  Generate with AI
                </Button>
              </div>
            </div>
          ) : (
            <CaptionCueList
              activeCueId={activeCueId}
              activeCueRef={activeCueRef}
              currentTime={currentTime}
              editingText={editingText}
              editingWordId={editingWordId}
              filteredCues={filteredCues}
              onCancelEditing={cancelEditingWord}
              onCommitEditing={commitEditingWord}
              onEditingTextChange={setEditingText}
              onSelectCue={selectCue}
              onStartEditing={startEditingWord}
            />
          )}
        </div>
      </div>
    </StudioPanelShell>
  )
}
