import Link from "next/link"

import { Button, buttonVariants } from "@/components/ui/button"
import { LongToShortTrigger } from "@/features/long-to-short/components/long-to-short-trigger"

type SectionHeaderProps = {
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
}

export function SectionHeader({
  title,
  description,
  actionLabel,
  actionHref,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground sm:text-xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {actionLabel && actionHref === "/long-to-short" ? (
        <LongToShortTrigger className={buttonVariants({ variant: "ghost", size: "sm" })}>
          {actionLabel}
        </LongToShortTrigger>
      ) : actionLabel && actionHref ? (
        <Button variant="ghost" size="sm" asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  )
}
