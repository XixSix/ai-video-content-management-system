import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { invalidateMediaQueries } from "./hooks/use-media-mutations"
import { mediaQueryKeys } from "./hooks/media-query-keys"
import type { MediaLibraryItem } from "./media-library.types"
import {
  formatDuration,
  getMediaItemsForTab,
} from "./media-library.utils"

function createItem(
  id: string,
  libraryGroup: MediaLibraryItem["libraryGroup"],
  overrides: Partial<MediaLibraryItem> = {}
): MediaLibraryItem {
  return {
    id,
    title: id,
    originalFilename: `${id}.mp4`,
    assetUrl: null,
    thumbnailUrl: null,
    duration: null,
    fileSizeBytes: 1,
    mimeType: "video/mp4",
    type: "VIDEO",
    libraryGroup,
    status: "UPLOADED",
    width: null,
    height: null,
    createdAt: "2026-06-19T10:00:00.000Z",
    updatedAt: "2026-06-19T10:00:00.000Z",
    hasTranscript: false,
    hasChapters: false,
    hasClips: false,
    hasSubtitles: false,
    activeJobCount: 0,
    ...overrides,
  }
}

describe("media library data boundaries", () => {
  it("formats fractional media durations as whole timeline seconds", () => {
    expect(formatDuration(361.372154)).toBe("6:01")
    expect(formatDuration(59.999)).toBe("0:59")
  })

  it("keeps real tabs free of mock output data", () => {
    const real = [createItem("real", "ORIGINAL")]
    const demo = [
      createItem("output", "EDITOR_OUTPUT", { isDemo: true }),
      createItem("source", "ORIGINAL", {
        isDemo: true,
        longToShortSourceId: "source-demo",
      }),
    ]

    expect(getMediaItemsForTab(real, demo, "ALL")).toEqual(real)
    expect(getMediaItemsForTab(real, demo, "ORIGINAL")).toEqual(real)
    expect(getMediaItemsForTab(real, demo, "EDITOR_OUTPUTS")).toEqual([
      demo[0],
    ])
    expect(getMediaItemsForTab(real, demo, "LONG_TO_SHORT")).toEqual([
      demo[1],
    ])
  })

  it("invalidates every media list, including recent media", async () => {
    const queryClient = new QueryClient()
    const workspaceId = "workspace-a"
    const libraryKey = mediaQueryKeys.list(workspaceId, { page: 1, limit: 50 })
    const recentKey = mediaQueryKeys.list(workspaceId, { page: 1, limit: 4 })
    const otherWorkspaceKey = mediaQueryKeys.list("workspace-b", {
      page: 1,
      limit: 50,
    })
    queryClient.setQueryData(libraryKey, { items: [] })
    queryClient.setQueryData(recentKey, { items: [] })
    queryClient.setQueryData(otherWorkspaceKey, { items: [] })

    await invalidateMediaQueries(queryClient, workspaceId)

    expect(queryClient.getQueryState(libraryKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(recentKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(otherWorkspaceKey)?.isInvalidated).toBe(
      false
    )
  })
})
