"use client"

import { useDeferredValue, useState } from "react"
import { useRouter } from "next/navigation"
import { FolderPlus, Upload } from "lucide-react"
import { toast } from "sonner"

import { DataPagination } from "@/components/shared/data-pagination"
import { SectionHeader } from "@/components/shared/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import {
  ProjectCreateDialog,
  type ProjectCreateMode,
} from "@/features/studio-hub/components/project-create-dialog"
import { StudioProjectCard } from "@/features/studio-hub/components/studio-project-card"
import { StudioProjectToolbar } from "@/features/studio-hub/components/studio-project-toolbar"
import {
  useCreateProject,
  useDeleteProject,
  useProjectList,
  useRenameProject,
} from "@/features/studio-hub/hooks/use-projects"
import { mapProjectToCard } from "@/features/studio-hub/studio-projects.mapper"
import type {
  ProjectStatus,
  StudioProjectCardData,
  StudioProjectSortKey,
} from "@/features/studio-hub/studio-projects.types"
import { getEditorHref } from "@/features/studio-hub/studio-projects.utils"
import { useWorkspace } from "@/features/workspaces/components/workspace-provider"

const PROJECT_PAGE_SIZE = 9

function getProjectSort(sortKey: StudioProjectSortKey) {
  if (sortKey === "oldest") {
    return { sortBy: "updatedAt" as const, sortOrder: "asc" as const }
  }

  if (sortKey === "name") {
    return { sortBy: "title" as const, sortOrder: "asc" as const }
  }

  return { sortBy: "updatedAt" as const, sortOrder: "desc" as const }
}

function ProjectGridLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="aspect-[4/3] w-full rounded-xl" />
      ))}
    </div>
  )
}

export function StudioProjectHub() {
  const router = useRouter()
  const authSession = useAuthSession()
  const { selectedWorkspaceId } = useWorkspace()
  const workspaceId = selectedWorkspaceId ?? ""
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">("ALL")
  const [sortKey, setSortKey] = useState<StudioProjectSortKey>("recent")
  const [currentPage, setCurrentPage] = useState(1)
  const [createDialog, setCreateDialog] = useState<{
    open: boolean
    mode: ProjectCreateMode
  }>({ open: false, mode: "blank" })
  const [projectToDelete, setProjectToDelete] =
    useState<StudioProjectCardData | null>(null)
  const deferredSearch = useDeferredValue(searchQuery.trim())
  const sort = getProjectSort(sortKey)
  const listQuery = useProjectList(workspaceId, {
    page: currentPage,
    limit: PROJECT_PAGE_SIZE,
    search: deferredSearch || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    ...sort,
  })
  const featuredQuery = useProjectList(workspaceId, {
    page: 1,
    limit: 1,
    sortBy: "updatedAt",
    sortOrder: "desc",
  })
  const createMutation = useCreateProject(workspaceId)
  const renameMutation = useRenameProject(workspaceId)
  const deleteMutation = useDeleteProject(workspaceId)
  const projects = (listQuery.data?.items ?? []).map(mapProjectToCard)
  const featuredProject = featuredQuery.data?.items[0]
    ? mapProjectToCard(featuredQuery.data.items[0])
    : null
  const currentUserId = authSession.data?.id

  const openCreateDialog = (mode: ProjectCreateMode) => {
    setCreateDialog({ open: true, mode })
  }

  const createProject = (
    input:
      | { mode: "blank"; title: string }
      | { mode: "from-media"; title: string; mediaId: string }
  ) => {
    createMutation.mutate(
      input.mode === "blank"
        ? { mode: "blank", data: { title: input.title } }
        : {
            mode: "from-media",
            data: { title: input.title, mediaId: input.mediaId },
          },
      {
        onSuccess: ({ project }) => {
          setCreateDialog((current) => ({ ...current, open: false }))
          toast.success("Project created", { description: project.title })
          router.push(getEditorHref(workspaceId, project.id))
        },
        onError: (error) =>
          toast.error("Unable to create project", {
            description:
              error instanceof Error ? error.message : "Please try again.",
          }),
      }
    )
  }

  const renameProject = (projectId: string, title: string) => {
    renameMutation.mutate(
      { projectId, title },
      {
        onSuccess: () => toast.success("Project renamed", { description: title }),
        onError: (error) =>
          toast.error("Unable to rename project", {
            description:
              error instanceof Error ? error.message : "Please try again.",
          }),
      }
    )
  }

  const deleteProject = () => {
    if (!projectToDelete) return

    deleteMutation.mutate(projectToDelete.id, {
      onSuccess: () => {
        toast.success("Project deleted", {
          description: projectToDelete.title,
        })
        setProjectToDelete(null)
      },
      onError: (error) =>
        toast.error("Unable to delete project", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        }),
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 py-6 lg:gap-10">
      <section className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-6 px-5 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-7">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-subtle">
              Project workspace
            </span>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-[2rem]">
                Studio
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                Open a project, continue editing, or start a new content
                workspace before dropping into the fullscreen studio editor.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => openCreateDialog("from-media")}
            >
              <Upload className="size-4" />
              Import media
            </Button>
            <Button size="lg" onClick={() => openCreateDialog("blank")}>
              <FolderPlus className="size-4" />
              New project
            </Button>
          </div>
        </div>
      </section>

      <StudioProjectToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={(value) => {
          setSearchQuery(value)
          setCurrentPage(1)
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => {
          setStatusFilter(value)
          setCurrentPage(1)
        }}
        sortKey={sortKey}
        onSortKeyChange={(value) => {
          setSortKey(value)
          setCurrentPage(1)
        }}
      />

      {!deferredSearch && statusFilter === "ALL" && featuredProject ? (
        <section className="space-y-4">
          <SectionHeader
            title="Continue editing"
            description="Jump back into the project you were shaping most recently."
          />
          <StudioProjectCard
            project={featuredProject}
            featured
            canMutate={featuredProject.userId === currentUserId}
            isRenaming={renameMutation.isPending}
            isDeleting={deleteMutation.isPending}
            onRename={renameProject}
            onDelete={setProjectToDelete}
          />
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionHeader
          title="All projects"
          description="Browse every workspace without dropping straight into the editor."
        />

        {listQuery.isLoading ? (
          <ProjectGridLoading />
        ) : listQuery.isError ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 text-center">
              <p className="text-sm font-semibold">Projects could not be loaded</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {listQuery.error instanceof Error
                  ? listQuery.error.message
                  : "Please check the API connection and try again."}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => void listQuery.refetch()}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : projects.length > 0 ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <StudioProjectCard
                  key={project.id}
                  project={project}
                  canMutate={project.userId === currentUserId}
                  isRenaming={renameMutation.isPending}
                  isDeleting={deleteMutation.isPending}
                  onRename={renameProject}
                  onDelete={setProjectToDelete}
                />
              ))}
            </div>
            <DataPagination
              page={listQuery.data?.meta.page ?? currentPage}
              pageSize={PROJECT_PAGE_SIZE}
              totalItems={listQuery.data?.meta.total ?? 0}
              onPageChange={setCurrentPage}
            />
          </>
        ) : (
          <Card className="border-border/70 bg-card/95">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-foreground">
                {deferredSearch || statusFilter !== "ALL"
                  ? "No projects match this view."
                  : "Create your first project."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Start a workspace here before jumping into the fullscreen studio
                editor.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {createDialog.open ? (
        <ProjectCreateDialog
          open
          workspaceId={workspaceId}
          initialMode={createDialog.mode}
          isSubmitting={createMutation.isPending}
          onOpenChange={(open) =>
            setCreateDialog((current) => ({ ...current, open }))
          }
          onSubmit={createProject}
        />
      ) : null}

      <Dialog
        open={Boolean(projectToDelete)}
        onOpenChange={(open) => {
          if (!open) setProjectToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              {projectToDelete
                ? `${projectToDelete.title} will be removed from Studio. Its source media stays in Media Library.`
                : "This project will be removed from Studio."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={deleteProject}
            >
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
