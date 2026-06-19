import { SearchX, UploadCloud } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type MediaLibraryEmptyStateProps = {
  mode: "empty" | "no-results"
  onPrimaryAction: () => void
  onSecondaryAction?: () => void
}

export function MediaLibraryEmptyState({
  mode,
  onPrimaryAction,
  onSecondaryAction,
}: MediaLibraryEmptyStateProps) {
  const isEmpty = mode === "empty"

  return (
    <Card
      className="overflow-hidden border-border/70 bg-card shadow-[var(--shadow-panel)]"
      style={{
        backgroundImage:
          "linear-gradient(180deg, color-mix(in srgb, var(--surface-raised) 92%, transparent), color-mix(in srgb, var(--surface-muted) 88%, transparent))",
      }}
    >
      <CardContent className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-background/80">
            {isEmpty ? (
              <UploadCloud className="size-6 text-foreground" />
            ) : (
              <SearchX className="size-6 text-foreground" />
            )}
          </span>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {isEmpty ? "No media in the library yet" : "No media matches this view"}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {isEmpty
                ? "Bring in your first source file here, then continue through transcript, chapter, subtitle, and long-to-short workflows from the same workspace."
                : "Try a different search term or clear the current filters to bring your library items back into view."}
            </p>
          </div>

          <div
            className="w-full rounded-2xl border border-dashed border-border bg-background/70 p-5 shadow-[var(--shadow-natural-xs)]"
            role="presentation"
          >
            <div className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-xl border border-border/60 bg-[color:var(--surface-raised)] p-5">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {isEmpty
                    ? "Drop source media to seed the library"
                    : "Filters narrowed the current results to zero"}
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  {isEmpty
                    ? "Supported uploads include video, audio, images, SRT, and VTT files."
                    : "The upload entry point stays available, even when the current query returns nothing."}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Button type="button" size="lg" onClick={onPrimaryAction}>
                  <UploadCloud className="size-4" />
                  Upload media
                </Button>
                {!isEmpty && onSecondaryAction ? (
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={onSecondaryAction}
                  >
                    Clear filters
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
