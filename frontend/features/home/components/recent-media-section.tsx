"use client"

import { SectionHeader } from "@/components/shared/section-header"
import { Card, CardContent } from "@/components/ui/card"
import { MediaLibraryCard } from "@/features/media-library/components/media-library-card"
import { MediaLibraryLoading } from "@/features/media-library/components/media-library-loading"
import { useMediaList } from "@/features/media-library/hooks/use-media-list"

export function RecentMediaSection() {
  const mediaQuery = useMediaList({
    page: 1,
    limit: 4,
    sortBy: "createdAt",
    sortOrder: "desc",
  })

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
      ) : mediaQuery.data && mediaQuery.data.items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mediaQuery.data.items.slice(0, 4).map((item, index) => (
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
