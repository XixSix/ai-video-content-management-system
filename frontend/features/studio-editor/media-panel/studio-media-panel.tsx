"use client"

import { useMemo, useState } from "react"

import {
  useStudioProjectState,
} from "@/features/studio-editor/store/studio-editor-store"
import { StudioPanelShell } from "@/features/studio-editor/tool-panel/components/studio-panel-shell"

import { MediaCard } from "./components/media-card"
import { MediaFilterTabs } from "./components/media-filter-tabs"
import { MediaUploadActions } from "./components/media-upload-actions"
import { MediaUploadQueue } from "./components/media-upload-queue"
import { useStudioMedia } from "./hooks/use-studio-media"
import type { MediaFilter } from "./lib/media-display"
import { getImportableMediaLibraryItems } from "./services/project-media-adapter"

export function StudioMediaPanel() {
  const { project } = useStudioProjectState()
  const {
    addFiles,
    attachMedia,
    attachingMediaId,
    canEdit,
    cancelUploadEntry,
    detachMedia,
    detachingMediaId,
    dismissUploadEntry,
    libraryError,
    libraryItems,
    libraryLoading,
    refetchLibrary,
    retryUploadEntry,
    setSourceMedia,
    settingSourceMediaId,
    uploadEntries,
  } = useStudioMedia()
  const [activeFilter, setActiveFilter] = useState<MediaFilter>("ALL")
  const mediaItems = project.projectMedia.filter((item) => item.type !== "SUBTITLE")
  const importableItems = useMemo(
    () => getImportableMediaLibraryItems(project.projectMedia, libraryItems),
    [libraryItems, project.projectMedia]
  )
  const filteredItems = useMemo(() => {
    if (activeFilter === "ALL") {
      return mediaItems
    }

    return mediaItems.filter((item) => item.type === activeFilter)
  }, [activeFilter, mediaItems])

  return (
    <StudioPanelShell title="Media">
      <div className="flex flex-1 flex-col overflow-auto p-4">
        <MediaUploadActions
          importableItems={importableItems}
          attachingMediaId={attachingMediaId}
          canEdit={canEdit}
          importError={libraryError instanceof Error ? libraryError : null}
          importLoading={libraryLoading}
          onImportMedia={attachMedia}
          onRetryImport={() => void refetchLibrary()}
          onUploadFiles={addFiles}
        />
        <MediaUploadQueue
          entries={uploadEntries}
          onCancel={cancelUploadEntry}
          onDismiss={dismissUploadEntry}
          onRetry={retryUploadEntry}
        />
        <MediaFilterTabs
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
          {filteredItems.map((item) => (
            <MediaCard
              key={item.id}
              canEdit={canEdit}
              detaching={detachingMediaId === item.id}
              item={item}
              onDetach={detachMedia}
              onSetSource={(media) => setSourceMedia(media.id)}
              settingSource={settingSourceMediaId === item.id}
            />
          ))}
        </div>
        {filteredItems.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center text-xs leading-5 text-muted-foreground">
            No media in this filter. Upload a file or import one from Media
            Library.
          </div>
        ) : null}
      </div>
    </StudioPanelShell>
  )
}
