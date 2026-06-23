"use client"

import { useMemo, useState } from "react"

import { useMediaDetails } from "@/features/media-library/hooks/use-media-detail"
import { getMediaPreviewThumbnailUrl } from "@/features/media-library/lib/media-previews"
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
import { useEditorRouteParams } from "../hooks/use-editor-route-params"

export function StudioMediaPanel() {
  const { workspaceId } = useEditorRouteParams()
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
  const mediaDetailQueries = useMediaDetails(
    workspaceId,
    mediaItems.map((item) => item.id),
    {
      enabled: mediaItems.length > 0,
      pollUntilReady: true,
    }
  )
  const mediaDetailsById = useMemo(
    () =>
      Object.fromEntries(
        mediaDetailQueries.flatMap((query) =>
          query.data?.media ? [[query.data.media.id, query.data.media]] : []
        )
      ),
    [mediaDetailQueries]
  )
  const importableItems = useMemo(
    () => getImportableMediaLibraryItems(project.projectMedia, libraryItems),
    [libraryItems, project.projectMedia]
  )
  const filteredItems = useMemo(() => {
    const items =
      activeFilter === "ALL"
        ? mediaItems
        : mediaItems.filter((item) => item.type === activeFilter)

    return items.map((item) => ({
      ...item,
      thumbnailUrl:
        item.thumbnailUrl ??
        (mediaDetailsById[item.id]
          ? getMediaPreviewThumbnailUrl(mediaDetailsById[item.id])
          : null),
    }))
  }, [activeFilter, mediaDetailsById, mediaItems])

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
              workspaceId={workspaceId}
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
