"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { MediaLibraryTab } from "../types/media-library.types";

function parseMediaLibraryTab(value: string | null): MediaLibraryTab {
  if (value === "original") {
    return "ORIGINAL";
  }

  if (value === "editor-outputs") {
    return "EDITOR_OUTPUTS";
  }

  if (value === "long-to-short") {
    return "LONG_TO_SHORT";
  }

  return "ALL";
}

function formatMediaLibraryTabParam(tab: MediaLibraryTab) {
  if (tab === "ORIGINAL") {
    return "original";
  }

  if (tab === "EDITOR_OUTPUTS") {
    return "editor-outputs";
  }

  if (tab === "LONG_TO_SHORT") {
    return "long-to-short";
  }

  return null;
}

export function useMediaLibraryUrlState() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const replaceParams = useCallback(
    (nextParams: URLSearchParams) => {
      const queryString = nextParams.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  const updateLibraryUrl = useCallback(
    (nextTab: MediaLibraryTab, nextSourceId?: string | null) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      const tabParam = formatMediaLibraryTabParam(nextTab);

      if (tabParam) {
        nextParams.set("tab", tabParam);
      } else {
        nextParams.delete("tab");
      }

      if (nextTab === "LONG_TO_SHORT" && nextSourceId) {
        nextParams.set("source", nextSourceId);
      } else {
        nextParams.delete("source");
      }

      nextParams.delete("preview");
      replaceParams(nextParams);
    },
    [replaceParams, searchParams],
  );

  const updatePreviewUrl = useCallback(
    (mediaId: string) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("preview", mediaId);
      nextParams.delete("source");
      replaceParams(nextParams);
    },
    [replaceParams, searchParams],
  );

  const clearPreviewUrl = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("preview");
    replaceParams(nextParams);
  }, [replaceParams, searchParams]);

  return {
    activeTab: parseMediaLibraryTab(searchParams.get("tab")),
    previewMediaId: searchParams.get("preview"),
    selectedLongToShortSourceId: searchParams.get("source"),
    clearPreviewUrl,
    updateLibraryUrl,
    updatePreviewUrl,
  };
}
