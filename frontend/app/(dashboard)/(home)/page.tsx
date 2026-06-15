import { SectionHeader } from "@/components/shared/section-header"
import { Card, CardContent } from "@/components/ui/card"
import {
  homeFeaturedTools,
  homeProcessingSummary,
  homeToolShortcuts,
} from "@/features/home/home.data"
import { ProcessingSummaryStrip } from "@/features/home/components/processing-summary-strip"
import { ToolLauncher } from "@/features/home/components/tool-launcher"
import { MediaLibraryCard } from "@/features/media-library/components/media-library-card"
import { mediaLibraryItems } from "@/features/media-library/media-library.data"

export default function Home() {
  const recentMediaItems = mediaLibraryItems
    .filter((item) => item.libraryGroup === "ORIGINAL")
    .slice(0, 4)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 py-6 lg:gap-10">
      <section className="space-y-4">
        <SectionHeader
          title="Jump back into work"
          description="Use direct entry points for the creation workflows that come up most often in your editing and publishing routine."
        />
        <ToolLauncher
          featuredTools={homeFeaturedTools}
          shortcuts={homeToolShortcuts}
        />
      </section>

      <ProcessingSummaryStrip summary={homeProcessingSummary} />

      <section className="space-y-4">
        <SectionHeader
          title="Recent media"
          description="Source uploads stay front and center so you can continue transcript, chapter, long-to-short, and subtitle work without hunting for the original file."
          actionLabel="View library"
          actionHref="/media-library"
        />
        {recentMediaItems.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recentMediaItems.map((item, index) => (
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
                No media uploaded yet.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your first source file will appear here once it lands in Media
                Library.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
