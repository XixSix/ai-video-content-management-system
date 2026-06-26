import type { MediaListQuery } from "../types/media-library.types";

export const mediaQueryKeys = {
  all: ["media"] as const,
  workspace: (workspaceId: string) =>
    [...mediaQueryKeys.all, workspaceId] as const,
  lists: (workspaceId: string) =>
    [...mediaQueryKeys.workspace(workspaceId), "list"] as const,
  list: (workspaceId: string, query: MediaListQuery) =>
    [...mediaQueryKeys.lists(workspaceId), query] as const,
  detail: (workspaceId: string, mediaId: string) =>
    [...mediaQueryKeys.workspace(workspaceId), "detail", mediaId] as const,
  preview: (workspaceId: string, mediaId: string) =>
    [...mediaQueryKeys.workspace(workspaceId), "preview", mediaId] as const,
};
