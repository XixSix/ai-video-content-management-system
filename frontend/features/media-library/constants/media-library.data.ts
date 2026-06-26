import type {
  FilterChipOption,
  MediaLibrarySortKey,
  MediaLibraryTab,
  MediaTypeFilter,
} from "../types/media-library.types";

export const mediaLibraryTabOptions: FilterChipOption<MediaLibraryTab>[] = [
  { label: "All", value: "ALL" },
  { label: "Original", value: "ORIGINAL" },
  { label: "Editor Outputs", value: "EDITOR_OUTPUTS" },
  { label: "Long to Short", value: "LONG_TO_SHORT" },
];

export const mediaTypeFilterOptions: FilterChipOption<MediaTypeFilter>[] = [
  { label: "All", value: "ALL" },
  { label: "Video", value: "VIDEO" },
  { label: "Audio", value: "AUDIO" },
  { label: "Image", value: "IMAGE" },
  { label: "Transcript", value: "TRANSCRIPT" },
];

export const mediaSortOptions: FilterChipOption<MediaLibrarySortKey>[] = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Name", value: "name" },
  { label: "Duration", value: "duration" },
];
