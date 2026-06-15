"use client"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"

type DataPaginationProps = {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  className?: string
}

function getPaginationItems(page: number, pageCount: number) {
  const pages = new Set([1, pageCount, page - 1, page, page + 1])
  const orderedPages = Array.from(pages)
    .filter((item) => item >= 1 && item <= pageCount)
    .sort((left, right) => left - right)

  return orderedPages.reduce<(number | "ellipsis")[]>((items, item) => {
    const previousItem = items.at(-1)

    if (typeof previousItem === "number" && item - previousItem > 1) {
      items.push("ellipsis")
    }

    items.push(item)
    return items
  }, [])
}

export function DataPagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  className,
}: DataPaginationProps) {
  const pageCount = Math.ceil(totalItems / pageSize)

  if (pageCount <= 1) {
    return null
  }

  const firstVisibleItem = (page - 1) * pageSize + 1
  const lastVisibleItem = Math.min(page * pageSize, totalItems)
  const paginationItems = getPaginationItems(page, pageCount)

  const renderLink = ({
    nextPage,
    children,
    isActive,
    ariaLabel,
  }: {
    nextPage: number
    children: React.ReactNode
    isActive?: boolean
    ariaLabel?: string
  }) => (
    <PaginationLink
      href="#"
      isActive={isActive}
      aria-label={ariaLabel}
      onClick={(event) => {
        event.preventDefault()

        if (nextPage !== page) {
          onPageChange(nextPage)
        }
      }}
    >
      {children}
    </PaginationLink>
  )

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        Showing {firstVisibleItem}-{lastVisibleItem} of {totalItems}
      </p>

      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              className={cn(page === 1 && "pointer-events-none opacity-50")}
              aria-disabled={page === 1}
              tabIndex={page === 1 ? -1 : undefined}
              onClick={(event) => {
                event.preventDefault()

                if (page > 1) {
                  onPageChange(page - 1)
                }
              }}
            />
          </PaginationItem>

          {paginationItems.map((item, index) =>
            item === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                {renderLink({
                  nextPage: item,
                  isActive: item === page,
                  ariaLabel: `Go to page ${item}`,
                  children: item,
                })}
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              className={cn(
                page === pageCount && "pointer-events-none opacity-50"
              )}
              aria-disabled={page === pageCount}
              tabIndex={page === pageCount ? -1 : undefined}
              onClick={(event) => {
                event.preventDefault()

                if (page < pageCount) {
                  onPageChange(page + 1)
                }
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
