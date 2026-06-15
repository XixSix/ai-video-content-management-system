"use client"

import Link from "next/link"
import Image from "next/image"
import {
  type FormEvent,
  useState,
} from "react"
import {
  AudioWaveform,
  Clapperboard,
  Download,
  MoreHorizontal,
  PencilLine,
  Send,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { cn } from "@/lib/utils"
import { formatShortDate } from "@/features/home/home.utils"
import type { StudioProject } from "@/features/studio-hub/studio-projects.types"

type StudioProjectCardProps = {
  project: StudioProject
  featured?: boolean
  onRename?: (projectId: string, name: string) => void
}

const thumbnailVariantClassName = {
  teal: "from-[#0f6278] via-[#17495b] to-[#0f2d3c]",
  slate: "from-[#30465e] via-[#1d2837] to-[#121821]",
  olive: "from-[#536746] via-[#364330] to-[#1c2419]",
  ember: "from-[#7a4831] via-[#42251b] to-[#1f130f]",
} as const

export function StudioProjectCard({
  project,
  featured = false,
  onRename,
}: StudioProjectCardProps) {
  const SourceIcon =
    project.sourceType === "VIDEO" ? Clapperboard : AudioWaveform

  return (
    <Card
      className={cn(
        "border-border/70 bg-card/95 py-0 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]",
        featured ? "lg:grid lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]" : ""
      )}
    >
      <Link
        href={`/editor/${project.slug}`}
        className={cn(
          "block border-b border-border/60",
          featured ? "lg:border-b-0 lg:border-r" : ""
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-muted",
            featured ? "aspect-[16/8.5] lg:h-full lg:min-h-[252px]" : "aspect-video"
          )}
        >
          {project.thumbnailUrl ? (
            <Image
              src={project.thumbnailUrl}
              alt=""
              fill
              sizes={featured ? "(min-width: 1024px) 46vw, 100vw" : "(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"}
              className="absolute inset-0 object-cover"
            />
          ) : (
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br",
                thumbnailVariantClassName[project.thumbnailVariant]
              )}
            />
          )}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.28))]" />
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <div className="flex items-end justify-between gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-lg border border-white/14 bg-black/18 text-white">
                <SourceIcon className="size-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <CardHeader className={cn("gap-2 pb-3", featured ? "lg:px-6 lg:pt-6" : "")}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <CardTitle
              className={cn(
                "line-clamp-2 text-[15px]",
                featured ? "lg:max-w-[14ch] lg:text-[2rem] lg:leading-[1.02]" : ""
              )}
            >
              <Link
                href={`/editor/${project.slug}`}
                className="hover:text-foreground-subtle"
              >
                {project.name}
              </Link>
            </CardTitle>
            <StudioProjectActionsMenu project={project} onRename={onRename} />
          </div>
        </CardHeader>

        <CardContent
          className={cn("pb-4", featured ? "lg:flex-1 lg:px-6 lg:pb-6" : "")}
        >
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Main source
            </p>
            <p className="text-sm text-foreground">{project.mainSourceMedia}</p>
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
  onRename,
}: {
  project: StudioProject
  onRename?: (projectId: string, name: string) => void
}) {
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState(project.name)

  const preventMenuAction = (event: Event) => {
    event.preventDefault()
  }

  const openRenameDialog = (event: Event) => {
    event.preventDefault()
    setNameDraft(project.name)
    setIsRenameOpen(true)
  }

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextName = nameDraft.trim()

    if (nextName) {
      onRename?.(project.id, nextName)
      setIsRenameOpen(false)
    }
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
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 min-w-44">
          <DropdownMenuItem onSelect={openRenameDialog}>
            <PencilLine className="size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={preventMenuAction}>
            <Download className="size-4" />
            Download
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={preventMenuAction}>
            <Send className="size-4" />
            Publish
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={preventMenuAction} variant="destructive">
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
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              placeholder="Project name"
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={!nameDraft.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
