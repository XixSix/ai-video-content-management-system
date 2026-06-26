export const transcriptQueryKeys = {
  all: ["transcripts"] as const,
  media: (mediaId: string) =>
    [...transcriptQueryKeys.all, "media", mediaId] as const,
  editor: (transcriptId: string) =>
    [...transcriptQueryKeys.all, "editor", transcriptId] as const,
}
