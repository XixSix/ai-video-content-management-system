import type {
  ClipCandidateListQuery,
  ShortClipListQuery,
} from "./short-clips.types"

export const shortClipsQueryKeys = {
  all: ["short-clips"] as const,
  media: (mediaId: string) => [...shortClipsQueryKeys.all, mediaId] as const,
  candidates: (mediaId: string) =>
    [...shortClipsQueryKeys.media(mediaId), "candidates"] as const,
  candidateList: (mediaId: string, query: ClipCandidateListQuery) =>
    [...shortClipsQueryKeys.candidates(mediaId), query] as const,
  shortClips: (mediaId: string) =>
    [...shortClipsQueryKeys.media(mediaId), "clips"] as const,
  shortClipList: (mediaId: string, query: ShortClipListQuery) =>
    [...shortClipsQueryKeys.shortClips(mediaId), query] as const,
}
