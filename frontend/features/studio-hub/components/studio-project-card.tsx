"use client"

import Link from "next/link"
import { type FormEvent, useState } from "react"
import {
  AudioWaveform,
  Clapperboard,
  FolderOpen,
  MoreHorizontal,
  PencilLine,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { formatShortDate } from "@/features/home/home.utils"
import type { StudioProjectCardData } from "@/features/studio-hub/studio-projects.types"
import { cn } from "@/lib/utils"

type StudioProjectCardProps = {
  project: StudioProjectCardData
  featured?: boolean
  canMutate: boolean
  isRenaming?: boolean
  isDeleting?: boolean
  onRename?: (projectId: string, title: string) => void
  onDelete?: (project: StudioProjectCardData) => void
}

const visualVariantClassName = {
  teal: "from-[#0f6278] via-[#17495b] to-[#0f2d3c]",
  slate: "from-[#30465e] via-[#1d2837] to-[#121821]",
  olive: "from-[#536746] via-[#364330] to-[#1c2419]",
  ember: "from-[#7a4831] via-[#42251b] to-[#1f130f]",
} as const

const statusVariant = {
  DRAFT: "neutral",
  ACTIVE: "success",
  ARCHIVED: "warning",
} as const

export function StudioProjectCard({
  project,
  featured = false,
  canMutate,
  isRenaming,
  isDeleting,
  onRename,
  onDelete,
}: StudioProjectCardProps) {
  const SourceIcon =
    project.sourceType === "VIDEO"
      ? Clapperboard
      : project.sourceType === "AUDIO"
        ? AudioWaveform
        : FolderOpen

  return (
    <Card
      className={cn(
        "border-border/70 bg-card/95 py-0 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]",
        featured
          ? "lg:grid lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]"
          : ""
      )}
    >
      <Link
        href={`/editor/${project.id}`}
        className={cn(
          "block border-b border-border/60",
          featured ? "lg:border-b-0 lg:border-r" : ""
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-muted",
            featured
              ? "aspect-[16/8.5] lg:h-full lg:min-h-[252px]"
              : "aspect-video"
          )}
        >
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-br",
              visualVariantClassName[project.visualVariant]
            )}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.32))]" />
          <div className="absolute inset-0 flex flex-col justify-between p-4">
            <div className="flex justify-end">
              <Badge
                variant={statusVariant[project.status]}
                className="border-white/15 bg-black/25 text-white backdrop-blur-sm"
              >
                {project.status}
              </Badge>
            </div>
            <span className="inline-flex size-11 items-center justify-center rounded-lg border border-white/14 bg-black/18 text-white">
              <SourceIcon className="size-4" />
            </span>
          </div>
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <CardHeader
          className={cn("gap-2 pb-3", featured ? "lg:px-6 lg:pt-6" : "")}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <CardTitle
              className={cn(
                "line-clamp-2 text-[15px]",
                featured
                  ? "lg:max-w-[14ch] lg:text-[2rem] lg:leading-[1.02]"
                  : ""
              )}
            >
              <Link
                href={`/editor/${project.id}`}
                className="hover:text-foreground-subtle"
              >
                {project.title}
              </Link>
            </CardTitle>
            {canMutate ? (
              <StudioProjectActionsMenu
                project={project}
                isRenaming={isRenaming}
                isDeleting={isDeleting}
                onRename={onRename}
                onDelete={onDelete}
              />
            ) : null}
          </div>
        </CardHeader>

        <CardContent
          className={cn("pb-4", featured ? "lg:flex-1 lg:px-6 lg:pb-6" : "")}
        >
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Main source
            </p>
            <p className="truncate text-sm text-foreground">
              {project.sourceLabel}
            </p>
            <p className="text-sm text-muted-foreground">
              Workspace updated {formatShortDate(project.updatedAt)}
            </p>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}

function StudioProjectActionsMenu({
  project,
  isRenaming,
  isDeleting,
  onRename,
  onDelete,
}: {
  project: StudioProjectCardData
  isRenaming?: boolean
  isDeleting?: boolean
  onRename?: (projectId: string, title: string) => void
  onDelete?: (project: StudioProjectCardData) => void
}) {
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [titleDraft, setTitleDraft] = useState(project.title)

  const openRenameDialog = (event: Event) => {
    event.preventDefault()
    setTitleDraft(project.title)
    setIsRenameOpen(true)
  }

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextTitle = titleDraft.trim()

    if (nextTitle && nextTitle !== project.title) {
      onRename?.(project.id, nextTitle)
    }

    setIsRenameOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-label="Project actions"
            disabled={isRenaming || isDeleting}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 min-w-44">
          <DropdownMenuItem onSelect={openRenameDialog}>
            <PencilLine className="size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => onDelete?.(project)}
            variant="destructive"
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <form onSubmit={submitRename} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Rename project</DialogTitle>
              <DialogDescription>
                Update the workspace name shown across Studio.
              </DialogDescription>
            </DialogHeader>

            <Input
              autoFocus
              maxLength={255}
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              placeholder="Project name"
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={!titleDraft.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
