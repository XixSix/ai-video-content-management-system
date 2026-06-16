"use client"

import { useMemo, useState } from "react"

import { useStudioProjectState } from "@/features/studio-editor/store/studio-editor-store"
import { StudioPanelShell } from "@/features/studio-editor/tool-panel/components/studio-panel-shell"

import { MediaCard } from "./components/media-card"
import { MediaFilterTabs } from "./components/media-filter-tabs"
import { MediaUploadActions } from "./components/media-upload-actions"
import type { MediaFilter } from "./lib/media-display"

export function StudioMediaPanel() {
  const { project } = useStudioProjectState()
  const [activeFilter, setActiveFilter] = useState<MediaFilter>("ALL")
  const mediaItems = project.projectMedia.filter((item) => item.type !== "SUBTITLE")
  const filteredItems = useMemo(() => {
    if (activeFilter === "ALL") {
      return mediaItems
    }

    return mediaItems.filter((item) => item.type === activeFilter)
  }, [activeFilter, mediaItems])

  return (
    <StudioPanelShell title="Media">
      <div className="flex flex-1 flex-col overflow-auto p-4">
        <MediaUploadActions />
        <MediaFilterTabs
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
          {filteredItems.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </StudioPanelShell>
  )
}
