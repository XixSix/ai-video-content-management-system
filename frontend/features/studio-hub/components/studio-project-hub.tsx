"use client"

import { useMemo, useState } from "react"
import { FolderPlus, Upload } from "lucide-react"

import { SectionHeader } from "@/components/shared/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StudioProjectCard } from "@/features/studio-hub/components/studio-project-card"
import { StudioProjectToolbar } from "@/features/studio-hub/components/studio-project-toolbar"
import { studioProjects } from "@/features/studio-hub/studio-projects.data"
import type {
  StudioProject,
  StudioProjectSortKey,
  StudioProjectStatus,
} from "@/features/studio-hub/studio-projects.types"

function sortProjects(
  projects: StudioProject[],
  sortKey: StudioProjectSortKey
) {
  const items = [...projects]

  if (sortKey === "name") {
    return items.sort((left, right) => left.name.localeCompare(right.name))
  }

  return items.sort((left, right) => {
    const delta =
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    return sortKey === "recent" ? delta : delta * -1
  })
}

export function StudioProjectHub() {
  const [projects, setProjects] = useState<StudioProject[]>(studioProjects)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StudioProjectStatus | "ALL">(
    "ALL"
  )
  const [sortKey, setSortKey] = useState<StudioProjectSortKey>("recent")

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    const matchingProjects = projects.filter((project) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : project.status === statusFilter
      const matchesQuery =
        normalizedQuery.length < 1
          ? true
          : project.name.toLowerCase().includes(normalizedQuery) ||
            project.mainSourceMedia.toLowerCase().includes(normalizedQuery)

      return matchesStatus && matchesQuery
    })

    return sortProjects(matchingProjects, sortKey)
  }, [projects, searchQuery, sortKey, statusFilter])

  const featuredProject = filteredProjects[0] ?? null
  const renameProject = (projectId: string, name: string) => {
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === projectId ? { ...project, name } : project
      )
    )
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
                Open a project, continue editing, or start a new content workspace
                before dropping into the fullscreen studio editor.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="lg">
              <Upload className="size-4" />
              Import media
            </Button>
            <Button size="lg">
              <FolderPlus className="size-4" />
              New project
            </Button>
          </div>
        </div>
      </section>

      <StudioProjectToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
      />

      {featuredProject ? (
        <section className="space-y-4">
          <SectionHeader
            title="Continue editing"
            description="Jump back into the project you were shaping most recently."
          />
          <StudioProjectCard
            project={featuredProject}
            featured
            onRename={renameProject}
          />
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionHeader
          title="All projects"
          description="Browse every active workspace without dropping straight into the editor."
        />

        {projects.length < 1 ? (
          <Card className="border-border/70 bg-card/95">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-foreground">
                Create your first project.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Start a workspace here before jumping into the fullscreen studio editor.
              </p>
            </CardContent>
          </Card>
        ) : filteredProjects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => (
              <StudioProjectCard
                key={project.id}
                project={project}
                onRename={renameProject}
              />
            ))}
          </div>
        ) : (
          <Card className="border-border/70 bg-card/95">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-foreground">
                No projects match this view.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search or create your first project.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
