"use client";

import { useRef, type ChangeEvent } from "react";
import { toast } from "sonner";

import type { MediaLibraryItem } from "../types/media-library.types";
import { mediaService } from "../services/media.service";
import { useDeleteMedia, useRenameMedia } from "./use-media-mutations";
import type { MediaLibraryUploadQueue } from "./use-media-library-items";

function openAssetUrl(url: string, filename?: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noreferrer";
  if (filename) {
    anchor.download = filename;
  }
  anchor.click();
}

type UseMediaLibraryActionsParams = {
  uploadQueue: MediaLibraryUploadQueue;
  workspaceId: string;
};

export function useMediaLibraryActions({
  uploadQueue,
  workspaceId,
}: UseMediaLibraryActionsParams) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const renameMutation = useRenameMedia(workspaceId);
  const deleteMutation = useDeleteMedia(workspaceId);

  const handleOpenUpload = () => {
    fileInputRef.current?.click();
  };

  const handleUploadSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length < 1) {
      return;
    }

    const rejected = uploadQueue.addFiles(selectedFiles);
    rejected.forEach(({ file, message }) => {
      toast.error(`Cannot upload ${file.name}`, { description: message });
    });

    event.target.value = "";
  };

  const renameMediaItem = (itemId: string, title: string) => {
    renameMutation.mutate(
      { mediaId: itemId, title },
      {
        onSuccess: () => toast.success("Media renamed", { description: title }),
        onError: (error) =>
          toast.error("Unable to rename media", {
            description:
              error instanceof Error ? error.message : "Please try again.",
          }),
      },
    );
  };

  const deleteMediaItem = (item: MediaLibraryItem) => {
    if (item.id.startsWith("local-upload-")) {
      uploadQueue.cancelUpload(item.id);
      uploadQueue.dismissUpload(item.id);
      toast.success("Upload canceled", { description: item.title });
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () =>
        toast.success("Media deleted", { description: item.title }),
      onError: (error) =>
        toast.error("Unable to delete media", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        }),
    });
  };

  const downloadMediaItem = async (item: MediaLibraryItem) => {
    try {
      const { url } = await mediaService.getDownloadUrl(workspaceId, item.id);
      openAssetUrl(url, item.originalFilename);
    } catch (error) {
      toast.error("Unable to prepare download", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return {
    fileInputRef,
    onDeleteItem: deleteMediaItem,
    onDismissUpload: (item: MediaLibraryItem) =>
      uploadQueue.dismissUpload(item.id),
    onDownloadItem: (item: MediaLibraryItem) => void downloadMediaItem(item),
    onOpenUpload: handleOpenUpload,
    onRenameItem: renameMediaItem,
    onRetryUpload: (item: MediaLibraryItem) => uploadQueue.retryUpload(item.id),
    onUploadSelection: handleUploadSelection,
  };
}
