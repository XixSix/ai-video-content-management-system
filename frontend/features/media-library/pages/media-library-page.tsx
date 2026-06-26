"use client"

import { Suspense } from "react"

import { MediaLibraryLoading } from "@/features/media-library/components/media-library-loading"
import { MediaLibraryPageShell } from "@/features/media-library/components/media-library-page-shell"
import { useMediaLibraryPage } from "@/features/media-library/hooks/use-media-library-page"

function MediaLibraryPageContent() {
  const page = useMediaLibraryPage()

  return <MediaLibraryPageShell {...page} />
}

export function MediaLibraryPage() {
  return (
    <Suspense fallback={<MediaLibraryLoading viewMode="grid" />}>
      <MediaLibraryPageContent />
    </Suspense>
  )
}
