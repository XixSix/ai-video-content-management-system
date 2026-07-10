import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import type {
  FeaturedTool,
  ToolShortcut,
} from "@/features/home/home.types"

type ToolLauncherProps = {
  featuredTools: FeaturedTool[]
  shortcuts: ToolShortcut[]
}

function ToolVisual({ tool }: { tool: FeaturedTool }) {
  return (
    <div className="relative h-full overflow-hidden bg-muted/45">
      <Image
        src={tool.preview.lightSrc}
        alt={tool.preview.alt}
        fill
        sizes="(min-width: 1280px) 33vw, (min-width: 1024px) 33vw, 100vw"
        className="object-cover transition duration-500 group-hover:scale-[1.02] dark:hidden"
        priority={false}
      />
      <Image
        src={tool.preview.darkSrc}
        alt={tool.preview.alt}
        fill
        sizes="(min-width: 1280px) 33vw, (min-width: 1024px) 33vw, 100vw"
        className="hidden object-cover transition duration-500 group-hover:scale-[1.02] dark:block"
        priority={false}
      />
    </div>
  )
}

export function ToolLauncher({
  featuredTools,
  shortcuts,
}: ToolLauncherProps) {
  return (
    <section className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-3">
        {featuredTools.map((tool) => (
          <Link
            key={tool.id}
            href={tool.href}
            className="group overflow-hidden rounded-xl border border-border/70 bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]"
          >
            <div className="h-32 border-b border-border/60">
              <ToolVisual tool={tool} />
            </div>
            <div className="space-y-1.5 p-4">
              <h3 className="text-[15px] font-semibold text-foreground">
                {tool.title}
              </h3>
              <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
                {tool.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {shortcuts.map(({ href, icon: Icon, id, label }) => (
          <Link
            key={id}
            href={href}
            className="group flex h-12 items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 text-sm font-semibold text-foreground shadow-[var(--shadow-natural-xs)] transition hover:border-foreground/25 hover:bg-muted/55"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted text-foreground">
                <Icon className="size-4" />
              </span>
              <span className="truncate">{label}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </section>
  )
}
