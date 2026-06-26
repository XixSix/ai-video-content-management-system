"use client";

import { useState } from "react";

import type {
  MediaLibrarySortKey,
  MediaLibraryViewMode,
  MediaTypeFilter,
} from "../types/media-library.types";

export function useMediaLibraryFilterState() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<MediaLibraryViewMode>("grid");
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>("ALL");
  const [sortKey, setSortKey] = useState<MediaLibrarySortKey>("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const resetFilters = () => {
    setSearchQuery("");
    setTypeFilter("ALL");
    setSortKey("newest");
    setCurrentPage(1);
  };

  return {
    currentPage,
    searchQuery,
    sortKey,
    typeFilter,
    viewMode,
    resetFilters,
    setCurrentPage,
    onSearchChange: (value: string) => {
      setSearchQuery(value);
      setCurrentPage(1);
    },
    onSortChange: (value: MediaLibrarySortKey) => {
      setSortKey(value);
      setCurrentPage(1);
    },
    onTypeFilterChange: (value: MediaTypeFilter) => {
      setTypeFilter(value);
      setCurrentPage(1);
    },
    onViewModeChange: (value: MediaLibraryViewMode) => {
      setViewMode(value);
      setCurrentPage(1);
    },
  };
}
