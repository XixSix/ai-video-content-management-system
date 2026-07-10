"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import type { RenderExportJob } from "./render-export.schema"
import {
  getRenderExportAssetId,
  isTerminalRenderExportJob,
  renderExportService,
} from "./render-export.service"
import {
  subscribeToRenderExportJobEvents,
  useCreateRenderExport,
} from "./render-export.queries"

export type RenderExportPhase = "idle" | "saving" | "rendering"

type UseRenderExportFlowInput = {
  blockedBySnapshot: boolean
  projectId: string
  saveNow: () => Promise<boolean>
  workspaceId: string
}

function openDownloadUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer")
}

export function useRenderExportFlow({
  blockedBySnapshot,
  projectId,
  saveNow,
  workspaceId,
}: UseRenderExportFlowInput) {
  const createRenderExport = useCreateRenderExport(workspaceId, projectId)
  const [phase, setPhase] = useState<RenderExportPhase>("idle")
  const exportSubscriptionRef = useRef<{ close: () => void } | null>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      exportSubscriptionRef.current?.close()
    }
  }, [])

  const stopExportTracking = () => {
    exportSubscriptionRef.current?.close()
    exportSubscriptionRef.current = null
  }

  const finishExport = async (job: RenderExportJob) => {
    if (!mountedRef.current) return

    stopExportTracking()
    setPhase("idle")

    if (job.status !== "COMPLETED") {
      toast.error("Export failed", {
        description: job.errorMessage ?? job.errorCode ?? "The render job did not complete.",
      })
      return
    }

    const assetId = getRenderExportAssetId(job)

    if (!assetId) {
      toast.error("Export failed", {
        description: "The render completed without a downloadable asset.",
      })
      return
    }

    try {
      const { url } = await renderExportService.getAssetDownloadUrl(assetId)

      toast.success("Export ready", {
        action: {
          label: "Download",
          onClick: () => openDownloadUrl(url),
        },
      })
    } catch (error) {
      toast.error("Export failed", {
        description:
          error instanceof Error
            ? error.message
            : "Could not prepare the download URL.",
      })
    }
  }

  const pollRenderExportJob = (jobId: string) => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const poll = () => {
      timeoutId = setTimeout(() => {
        void renderExportService
          .getJob(jobId)
          .then(({ job }) => {
            if (cancelled || !mountedRef.current) return

            if (isTerminalRenderExportJob(job)) {
              void finishExport(job)
              return
            }

            poll()
          })
          .catch((error: unknown) => {
            if (cancelled || !mountedRef.current) return

            setPhase("idle")
            toast.error("Export failed", {
              description:
                error instanceof Error
                  ? error.message
                  : "Could not read render job status.",
            })
          })
      }, 2000)
    }

    poll()

    return {
      close: () => {
        cancelled = true

        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      },
    }
  }

  const trackRenderExportJob = (job: RenderExportJob) => {
    stopExportTracking()

    if (isTerminalRenderExportJob(job)) {
      void finishExport(job)
      return
    }

    let pollingStarted = false

    exportSubscriptionRef.current = subscribeToRenderExportJobEvents({
      jobId: job.id,
      onError: () => {
        if (pollingStarted || !mountedRef.current) return

        pollingStarted = true
        exportSubscriptionRef.current = pollRenderExportJob(job.id)
      },
      onJob: (nextJob) => {
        if (isTerminalRenderExportJob(nextJob)) {
          void finishExport(nextJob)
        }
      },
    })
  }

  const startExport = async () => {
    if (phase !== "idle" || blockedBySnapshot) {
      return
    }

    setPhase("saving")

    const saved = await saveNow()

    if (!saved) {
      setPhase("idle")
      toast.error("Export failed", {
        description: "Resolve the current snapshot save state before exporting.",
      })
      return
    }

    try {
      setPhase("rendering")

      const { job } = await createRenderExport.mutateAsync()

      toast.success("Export render started")
      trackRenderExportJob(job)
    } catch (error) {
      setPhase("idle")
      toast.error("Export failed", {
        description:
          error instanceof Error
            ? error.message
            : "Could not start the render job.",
      })
    }
  }

  return {
    disabled:
      phase !== "idle" || blockedBySnapshot || !workspaceId || !projectId,
    phase,
    startExport,
  }
}
