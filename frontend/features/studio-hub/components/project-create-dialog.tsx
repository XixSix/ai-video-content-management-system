"use client"

import { type FormEvent, useState } from "react"
import { AudioWaveform, Clapperboard, LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useMediaList } from "@/features/media-library/hooks/use-media-list"
import type { MediaLibraryItem } from "@/features/media-library/types/media-library.types"
import { cn } from "@/lib/utils"

export type ProjectCreateMode = "blank" | "from-media"

type ProjectCreateDialogProps = {
  open: boolean
  workspaceId: string
  initialMode: ProjectCreateMode
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (
    input:
      | { mode: "blank"; title: string }
      | { mode: "from-media"; title: string; mediaId: string }
  ) => void
}

export function ProjectCreateDialog({
  open,
  workspaceId,
  initialMode,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: ProjectCreateDialogProps) {
  const [mode, setMode] = useState<ProjectCreateMode>(initialMode)
  const [title, setTitle] = useState("")
  const [selectedMedia, setSelectedMedia] = useState<MediaLibraryItem | null>(
    null
  )
  const mediaQuery = useMediaList(workspaceId, {
    page: 1,
    limit: 50,
    status: "UPLOADED",
    sortBy: "createdAt",
    sortOrder: "desc",
  })
  const importableMedia = (mediaQuery.data?.items ?? []).filter(
    (item) => item.type === "VIDEO" || item.type === "AUDIO"
  )

  const selectMedia = (item: MediaLibraryItem) => {
    setSelectedMedia(item)
    if (!title.trim()) {
      setTitle(item.title)
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedTitle = title.trim()

    if (!normalizedTitle) return

    if (mode === "blank") {
      onSubmit({ mode, title: normalizedTitle })
      return
    }

    if (selectedMedia) {
      onSubmit({
        mode,
        title: normalizedTitle,
        mediaId: selectedMedia.id,
      })
    }
  }

  const canSubmit =
    Boolean(title.trim()) && (mode === "blank" || Boolean(selectedMedia))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Create a Studio project</DialogTitle>
            <DialogDescription>
              Start empty or anchor the workspace to an uploaded video or audio
              source.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/70 p-1">
            <Button
              type="button"
              variant={mode === "blank" ? "secondary" : "ghost"}
              onClick={() => setMode("blank")}
            >
              Blank project
            </Button>
            <Button
              type="button"
              variant={mode === "from-media" ? "secondary" : "ghost"}
              onClick={() => setMode("from-media")}
            >
              From media
            </Button>
          </div>

          {mode === "from-media" ? (
            <div className="space-y-2">
              <Label>Source media</Label>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border/70 bg-background/40 p-2">
                {mediaQuery.isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full" />
                  ))
                ) : mediaQuery.isError ? (
                  <div className="p-4 text-center">
                    <p className="text-sm font-medium">
                      Media Library could not be loaded.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => void mediaQuery.refetch()}
                    >
                      Try again
                    </Button>
                  </div>
                ) : importableMedia.length < 1 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    Upload a video or audio file in Media Library first.
                  </p>
                ) : (
                  importableMedia.map((item) => {
                    const Icon =
                      item.type === "VIDEO" ? Clapperboard : AudioWaveform
                    const isSelected = selectedMedia?.id === item.id

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition",
                          isSelected
                            ? "border-primary/50 bg-primary/8"
                            : "border-transparent hover:border-border hover:bg-muted/60"
                        )}
                        onClick={() => selectMedia(item)}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {item.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.originalFilename}
                          </span>
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="project-title">Project title</Label>
            <Input
              id="project-title"
              autoFocus={mode === "blank"}
              maxLength={255}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Campaign workspace"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
