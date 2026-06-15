import type {
  LongToShortCaptionPreset,
  LongToShortCandidate,
  LongToShortClipLength,
  LongToShortClip,
  LongToShortClipModel,
  LongToShortGenre,
  LongToShortJob,
  LongToShortSpeechLanguage,
  LongToShortSettings,
  LongToShortSource,
} from "./long-to-short.types"

export const longToShortSources: LongToShortSource[] = [
  {
    id: "source_launch_keynote",
    projectSlug: "project-launch-campaign",
    title: "Project Launch Campaign",
    sourceFileName:
      "YTDown_Shorts_Tai-Sao-Ong-Ta-Lai-Cat-Banh-Mot-Cach-Chi_Media_b8-wz8QqAFY_001_1080p.mp4",
    assetUrl:
      "/YTDown_Shorts_Tai-Sao-Ong-Ta-Lai-Cat-Banh-Mot-Cach-Chi_Media_b8-wz8QqAFY_001_1080p.mp4",
    thumbnailUrl: "/pexels-danil-lysov-175964361-12377231.jpg",
    type: "VIDEO",
    durationSeconds: 28,
    durationLabel: "00:28",
    resolutionLabel: "1080 x 1920",
    transcriptStatus: "READY",
    chapterStatus: "READY",
    status: "READY",
  },
  {
    id: "source_founder_ama",
    projectSlug: "founder-ama",
    title: "Founder AMA",
    sourceFileName:
      "YTDown_Shorts_Gau-Khong-Lang-Phi-Nhu-Ban-Nghi_Media_307SMR9ERs_009_128k.mp3",
    assetUrl:
      "/YTDown_Shorts_Gau-Khong-Lang-Phi-Nhu-Ban-Nghi_Media_307SMR9ERs_009_128k.mp3",
    thumbnailUrl: null,
    type: "AUDIO",
    durationSeconds: 55,
    durationLabel: "00:55",
    resolutionLabel: "Audio only",
    transcriptStatus: "READY",
    chapterStatus: "MISSING",
    status: "PROCESSING",
  },
  {
    id: "source_retail_story",
    projectSlug: "retail-customer-story",
    title: "Retail Customer Story",
    sourceFileName:
      "YTDown_YouTube_Wildlife-Windows-7-Sample-Video_Media_a3ICNMQW7Ok_001_720p.mp4",
    assetUrl:
      "/YTDown_YouTube_Wildlife-Windows-7-Sample-Video_Media_a3ICNMQW7Ok_001_720p.mp4",
    thumbnailUrl: "/pexels-francesco-ungaro-16771889.jpg",
    type: "VIDEO",
    durationSeconds: 30,
    durationLabel: "00:30",
    resolutionLabel: "1280 x 720",
    transcriptStatus: "READY",
    chapterStatus: "READY",
    status: "READY",
  },
]

export const defaultLongToShortSettings: LongToShortSettings = {
  mode: "AI_CLIPPING",
  speechLanguage: "AUTO",
  clipModel: "AUTO",
  genre: "AUTO",
  clipLength: "AUTO",
  autoHook: true,
  prompt: "",
  captionPresetId: "karaoke",
  aspectRatio: "9:16",
  processingStartTime: 0,
  processingEndTime: 0,
}

export const longToShortSpeechLanguageOptions: Array<{
  label: string
  value: LongToShortSpeechLanguage
}> = [
  { label: "Auto", value: "AUTO" },
  { label: "English", value: "ENGLISH" },
  { label: "Vietnamese", value: "VIETNAMESE" },
]

export const longToShortClipModelOptions: Array<{
  label: string
  value: LongToShortClipModel
}> = [
  { label: "Auto", value: "AUTO" },
  { label: "Balanced", value: "BALANCED" },
  { label: "Viral hooks", value: "VIRAL_HOOKS" },
]

export const longToShortGenreOptions: Array<{
  label: string
  value: LongToShortGenre
}> = [
  { label: "Auto", value: "AUTO" },
  { label: "Podcast", value: "PODCAST" },
  { label: "Interview", value: "INTERVIEW" },
  { label: "Tutorial", value: "TUTORIAL" },
  { label: "Webinar", value: "WEBINAR" },
]

export const longToShortClipLengthOptions: Array<{
  label: string
  value: LongToShortClipLength
}> = [
  { label: "Auto (0m-3m)", value: "AUTO" },
  { label: "15-30s", value: "15_30" },
  { label: "30-60s", value: "30_60" },
  { label: "60-90s", value: "60_90" },
]

export const longToShortCaptionPresets: LongToShortCaptionPreset[] = [
  {
    id: "no-caption",
    label: "No caption",
    samplePrimary: "",
    sampleSecondary: "",
    tone: "neutral",
    isNoCaption: true,
  },
  {
    id: "beasty",
    label: "Beasty",
    samplePrimary: "TO GET",
    sampleSecondary: "STARTED",
    tone: "amber",
  },
  {
    id: "youshaei",
    label: "Youshaei",
    samplePrimary: "TO GET",
    sampleSecondary: "STARTED",
    tone: "neutral",
  },
  {
    id: "mozi",
    label: "Mozi",
    samplePrimary: "TO GET",
    sampleSecondary: "STARTED",
    tone: "violet",
  },
  {
    id: "glitch-infinite",
    label: "Glitch Infinite",
    samplePrimary: "TO GET",
    sampleSecondary: "started",
    tone: "amber",
    isNew: true,
  },
  {
    id: "karaoke",
    label: "Karaoke",
    samplePrimary: "TO GET",
    sampleSecondary: "STARTED",
    tone: "lime",
  },
]

export const longToShortJobsBySourceId: Record<string, LongToShortJob> = {
  source_launch_keynote: {
    sourceId: "source_launch_keynote",
    status: "RUNNING",
    progress: 62,
    currentStep: "Rendering vertical drafts from selected moments",
  },
  source_founder_ama: {
    sourceId: "source_founder_ama",
    status: "QUEUED",
    progress: 12,
    currentStep: "Waiting for chapter-aware candidate generation",
  },
  source_retail_story: {
    sourceId: "source_retail_story",
    status: "COMPLETED",
    progress: 100,
    currentStep: "Draft clips ready for review",
  },
}

export const longToShortCandidatesBySourceId: Record<string, LongToShortCandidate[]> = {
  source_launch_keynote: [
    {
      id: "candidate_launch_001",
      sourceId: "source_launch_keynote",
      sourceChapterLabel: "Why transcript quality matters",
      title: "Transcript before everything",
      caption: "Why transcript cleanup pays off before chapters and clips.",
      thumbnailUrl: "/pexels-danil-lysov-175964361-12377231.jpg",
      startTime: 2,
      endTime: 12,
      duration: 10,
      transcript:
        "The workflow starts with a clean transcript before anything downstream becomes useful.",
      reviewNotes: [
        "Strong opening line",
        "Self-contained idea",
        "Good short-form length",
      ],
      status: "SELECTED",
      aspectRatio: "9:16",
      platform: "TIKTOK",
      burnSubtitles: true,
      transcriptVersionLabel: "Transcript v4",
      isOutdated: true,
    },
    {
      id: "candidate_launch_002",
      sourceId: "source_launch_keynote",
      sourceChapterLabel: "Reusable content pipeline",
      title: "When clips stop drifting",
      caption: "The transcript keeps chapters and short clips aligned to the actual message.",
      thumbnailUrl: "/pexels-danil-lysov-175964361-12377231.jpg",
      startTime: 12,
      endTime: 22,
      duration: 10,
      transcript:
        "Once the wording is right, chaptering and clip selection stop drifting away from the actual message.",
      reviewNotes: [
        "Clear takeaway",
        "Ending lands cleanly",
        "Works well for vertical video",
      ],
      status: "RECOMMENDED",
      aspectRatio: "9:16",
      platform: "YOUTUBE_SHORTS",
      burnSubtitles: true,
      transcriptVersionLabel: "Transcript v4",
    },
    {
      id: "candidate_launch_003",
      sourceId: "source_launch_keynote",
      sourceChapterLabel: "Reusable content pipeline",
      title: "One upload, many outputs",
      caption: "How one source recording becomes chapters, clips, subtitles, and publish-ready assets.",
      thumbnailUrl: "/pexels-francesco-ungaro-16771889.jpg",
      startTime: 5,
      endTime: 26,
      duration: 21,
      transcript:
        "That gives the team something they can review, publish, and reuse without re-uploading the source video.",
      reviewNotes: [
        "Clear business value",
        "Useful standalone takeaway",
        "Needs tighter opening",
      ],
      status: "NEEDS_REVIEW",
      aspectRatio: "1:1",
      platform: "INSTAGRAM_REELS",
      burnSubtitles: false,
      transcriptVersionLabel: "Transcript v4",
    },
  ],
  source_founder_ama: [
    {
      id: "candidate_ama_001",
      sourceId: "source_founder_ama",
      title: "Why consistency wins",
      caption: "The point most creators miss when they judge content too early.",
      thumbnailUrl: null,
      startTime: 6,
      endTime: 36,
      duration: 30,
      transcript:
        "Most channels do not fail because the topic is wrong. They fail because the team stops before the feedback loop has enough time to work.",
      reviewNotes: [
        "Strong lesson",
        "Clear emotional arc",
        "Needs chapter context later",
      ],
      status: "RECOMMENDED",
      aspectRatio: "9:16",
      platform: "TIKTOK",
      burnSubtitles: true,
      transcriptVersionLabel: "Transcript v2",
    },
  ],
  source_retail_story: [
    {
      id: "candidate_retail_001",
      sourceId: "source_retail_story",
      sourceChapterLabel: "Customer moment",
      title: "The turning point in onboarding",
      caption: "A short answer that lands fast without needing extra setup.",
      thumbnailUrl: "/pexels-francesco-ungaro-16771889.jpg",
      startTime: 3,
      endTime: 25,
      duration: 22,
      transcript:
        "The team finally trusted the workflow once onboarding stopped depending on handoffs between five different tools.",
      reviewNotes: [
        "Fast opening",
        "Easy to understand alone",
        "Clean closing sentence",
      ],
      status: "RECOMMENDED",
      aspectRatio: "9:16",
      platform: "INSTAGRAM_REELS",
      burnSubtitles: true,
      transcriptVersionLabel: "Transcript v3",
    },
  ],
}

export const longToShortClipsBySourceId: Record<string, LongToShortClip[]> = {
  source_launch_keynote: [
    {
      id: "clip_launch_001",
      sourceId: "source_launch_keynote",
      sourceCandidateId: "candidate_launch_001",
      title: "Transcript before everything",
      caption: "Why transcript cleanup pays off before chapters and clips.",
      startTime: 2,
      endTime: 12,
      duration: 10,
      status: "READY",
      aspectRatio: "9:16",
      platform: "TIKTOK",
      burnSubtitles: true,
      updatedAtLabel: "Updated 2h ago",
    },
    {
      id: "clip_launch_002",
      sourceId: "source_launch_keynote",
      sourceCandidateId: "candidate_launch_002",
      title: "When clips stop drifting",
      caption: "The transcript keeps chapters and short clips aligned to the actual message.",
      startTime: 12,
      endTime: 22,
      duration: 10,
      status: "DRAFT",
      aspectRatio: "9:16",
      platform: "YOUTUBE_SHORTS",
      burnSubtitles: true,
      updatedAtLabel: "Updated 18m ago",
    },
  ],
  source_founder_ama: [],
  source_retail_story: [
    {
      id: "clip_retail_001",
      sourceId: "source_retail_story",
      sourceCandidateId: "candidate_retail_001",
      title: "The turning point in onboarding",
      caption: "A short answer that lands fast without needing extra setup.",
      startTime: 3,
      endTime: 25,
      duration: 22,
      status: "READY",
      aspectRatio: "1:1",
      platform: "INSTAGRAM_REELS",
      burnSubtitles: true,
      updatedAtLabel: "Updated yesterday",
    },
  ],
}
