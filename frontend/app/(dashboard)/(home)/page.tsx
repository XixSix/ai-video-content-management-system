import { SectionHeader } from "@/components/shared/section-header"
import { Card, CardContent } from "@/components/ui/card"
import {
  homeProcessingSummary,
  homeQuickActions,
  homeRecentMedia,
  homeRecentOutputs,
} from "@/features/home/home.data"
import { MediaCard } from "@/features/home/components/media-card"
import { OutputCard } from "@/features/home/components/output-card"
import { ProcessingSummaryStrip } from "@/features/home/components/processing-summary-strip"
import { QuickActionCard } from "@/features/home/components/quick-action-card"
import { UploadHero } from "@/features/home/components/upload-hero"

export default function Home() {
  const recentOutputs = homeRecentOutputs.slice(0, 4)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 py-6 lg:gap-10">
      <UploadHero />

      <section className="space-y-4">
        <SectionHeader
          title="Jump back into work"
          description="Use direct entry points for the workflows that come up most often in your editing and publishing routine."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {homeQuickActions.map((action) => (
            <QuickActionCard key={action.id} {...action} />
          ))}
        </div>
      </section>

      <ProcessingSummaryStrip summary={homeProcessingSummary} />

      <section className="space-y-4">
        <SectionHeader
          title="Recent media"
          description="Source uploads stay front and center so you can continue transcript, chapter, long-to-short, and subtitle work without hunting for the original file."
          actionLabel="View library"
          actionHref="/media-library"
        />
        {homeRecentMedia.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {homeRecentMedia.map((item) => (
              <MediaCard key={item.id} item={item} />
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

      <section className="space-y-4">
        <SectionHeader
          title="Recent outputs"
          description="Keep an eye on the latest transcript, chapter, long-to-short, and subtitle artifacts without turning Home into a job console."
          actionLabel="Open Long to Short"
          actionHref="/long-to-short"
        />
        {recentOutputs.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {recentOutputs.map((item) => (
              <OutputCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Card className="border-border/70 bg-card/95">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-foreground">
                No recent outputs yet.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Generated transcripts, chapters, long-to-short outputs, and
                subtitles will show up here as they become available.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
