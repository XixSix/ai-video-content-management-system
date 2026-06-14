import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { LongToShortTrigger } from "@/features/long-to-short/components/long-to-short-trigger"

type QuickActionCardProps = {
  href: string
  icon: LucideIcon
  label: string
  description: string
  isSoon?: boolean
}

export function QuickActionCard({
  href,
  icon: Icon,
  label,
  description,
  isSoon,
}: QuickActionCardProps) {
  const cardContent = (
    <Card className="h-full border-border/70 bg-card/90 py-0 transition-all hover:-translate-y-0.5 hover:ring-foreground/15">
      <CardContent className="flex h-full min-h-34 flex-col justify-between gap-5 p-4 sm:p-5">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl border border-border/70 bg-muted text-foreground">
              <Icon className="size-4" />
            </span>
            {isSoon ? <Badge variant="neutral">Soon</Badge> : null}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-[15px] font-semibold text-foreground">
              {label}
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground-subtle transition-colors group-hover:text-foreground">
          Open
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </CardContent>
    </Card>
  )

  if (href === "/long-to-short") {
    return (
      <LongToShortTrigger className="group block h-full w-full text-left">
        {cardContent}
      </LongToShortTrigger>
    )
  }

  return (
    <Link href={href} className="group block h-full">
      {cardContent}
    </Link>
  )
}
