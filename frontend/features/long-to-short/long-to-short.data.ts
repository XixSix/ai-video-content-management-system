import type {
  LongToShortCaptionPreset,
  LongToShortClipLength,
  LongToShortClipModel,
  LongToShortGenre,
  LongToShortSpeechLanguage,
  LongToShortSettings,
} from "./long-to-short.types"

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
