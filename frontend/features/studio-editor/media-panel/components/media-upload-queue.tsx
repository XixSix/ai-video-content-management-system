"use client"

import { AlertCircle, LoaderCircle, RotateCcw, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { StudioMediaUploadEntry } from "../hooks/use-studio-media"

export function MediaUploadQueue({
  entries,
  onCancel,
  onDismiss,
  onRetry,
}: {
  entries: StudioMediaUploadEntry[]
  onCancel: (entryId: string) => void
  onDismiss: (entryId: string) => void
  onRetry: (entry: StudioMediaUploadEntry) => void
}) {
  if (!entries.length) return null

  return (
    <section className="mt-4 space-y-2 rounded-xl border border-border bg-surface-muted/55 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Uploads
      </p>
      {entries.map((entry) => {
        const hasError =
          entry.status === "failed" || entry.status === "attach-error"
        const statusLabel =
          entry.status === "attaching"
            ? "Adding to project…"
            : entry.status === "attach-error"
              ? "Uploaded · attach failed"
              : entry.status === "failed"
                ? entry.error ?? "Upload failed"
                : `${entry.progress}%`

        return (
          <div
            key={entry.id}
            className="rounded-lg border border-border bg-background p-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              {hasError ? (
                <AlertCircle className="size-4 shrink-0 text-destructive" />
              ) : (
                <LoaderCircle className="size-4 shrink-0 animate-spin text-sky-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {entry.file.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {statusLabel}
                </p>
              </div>
              {hasError ? (
                <>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Retry ${entry.file.name}`}
                    onClick={() => onRetry(entry)}
                  >
                    <RotateCcw />
                  </Button>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Dismiss ${entry.file.name}`}
                    onClick={() => onDismiss(entry.id)}
                  >
                    <X />
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Cancel ${entry.file.name}`}
                  disabled={entry.status === "attaching"}
                  onClick={() => onCancel(entry.id)}
                >
                  <X />
                </Button>
              )}
            </div>
            {entry.status === "uploading" ? (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-sky-500 transition-[width]"
                  style={{ width: `${entry.progress}%` }}
                />
              </div>
            ) : null}
          </div>
        )
      })}
    </section>
  )
}
