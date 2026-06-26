export const chapterQueryKeys = {
  all: ["chapters"] as const,
  media: (mediaId: string) =>
    [...chapterQueryKeys.all, "media", mediaId] as const,
}
