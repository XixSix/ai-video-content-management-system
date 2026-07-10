"use client"

import { useQueries } from "@tanstack/react-query"

import { SectionHeader } from "@/components/shared/section-header"
import { Card, CardContent } from "@/components/ui/card"
import { MediaLibraryCard } from "@/features/media-library/components/media-library-card"
import { MediaLibraryLoading } from "@/features/media-library/components/media-library-loading"
import { useMediaList } from "@/features/media-library/hooks/use-media-list"
import { mediaQueryKeys } from "@/features/media-library/hooks/media-query-keys"
import { mediaService } from "@/features/media-library/services/media.service"
import { useWorkspace } from "@/features/workspaces/components/workspace-provider"

export function RecentMediaSection() {
  const { selectedWorkspaceId } = useWorkspace()
  const mediaQuery = useMediaList(selectedWorkspaceId ?? "", {
    page: 1,
    limit: 4,
    sortBy: "createdAt",
    sortOrder: "desc",
  })
  const recentItems = mediaQuery.data?.items.slice(0, 4) ?? []
  const imagePreviewQueries = useQueries({
    queries: recentItems.map((item) => ({
      queryKey: mediaQueryKeys.preview(selectedWorkspaceId ?? "", item.id),
      queryFn: () => mediaService.getPreviewUrl(selectedWorkspaceId!, item.id),
      enabled:
        Boolean(selectedWorkspaceId) &&
        item.type === "IMAGE" &&
        item.status === "UPLOADED" &&
        !item.thumbnailUrl &&
        !item.assetUrl,
      staleTime: 5 * 60 * 1000,
    })),
  })
  const previewUrlById = new Map(
    recentItems
      .map((item, index) => [item.id, imagePreviewQueries[index]?.data?.url] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
  )
  const enrichedRecentItems = recentItems.map((item) =>
    item.type === "IMAGE" && previewUrlById.has(item.id)
      ? { ...item, assetUrl: previewUrlById.get(item.id)! }
      : item
  )

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Recent media"
        description="Source uploads stay front and center so you can continue transcript, chapter, long-to-short, and subtitle work without hunting for the original file."
        actionLabel="View library"
        actionHref="/media-library"
      />
      {mediaQuery.isLoading ? (
        <MediaLibraryLoading viewMode="grid" />
      ) : enrichedRecentItems.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {enrichedRecentItems.map((item, index) => (
            <MediaLibraryCard
              key={item.id}
              eagerThumbnail={index < 4}
              item={item}
              href={`/media-library?preview=${item.id}`}
              showActions={false}
            />
          ))}
        </div>
      ) : (
        <Card className="border-border/70 bg-card/95">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-foreground">
              {mediaQuery.isError
                ? "Recent media is unavailable."
                : "No media uploaded yet."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mediaQuery.isError
                ? "Open Media Library to retry loading your source files."
                : "Your first source file will appear here once it lands in Media Library."}
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
