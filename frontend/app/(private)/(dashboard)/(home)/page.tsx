import { SectionHeader } from "@/components/shared/section-header"
import {
  homeFeaturedTools,
  homeToolShortcuts,
} from "@/features/home/home.data"
import { ToolLauncher } from "@/features/home/components/tool-launcher"
import { RecentMediaSection } from "@/features/home/components/recent-media-section"
import { RecentJobsSection } from "@/features/home/components/recent-jobs-section"

export default function Home() {
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

      <RecentJobsSection />

      <RecentMediaSection />
    </div>
  )
}
