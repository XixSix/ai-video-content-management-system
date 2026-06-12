import {
  AudioLines,
  Captions,
  Clapperboard,
  FolderOpen,
  ListTree,
  Scissors,
  Sparkles,
  Type,
} from "lucide-react"

import type {
  StudioEditorProject,
  StudioRailItem,
  StudioSelection,
  StudioTextAnimationBy,
  StudioTextAnimationName,
  StudioTextFontFamily,
  StudioTextPreset,
  StudioTranscriptSegment,
  StudioTranscriptWord,
  StudioToolId,
  StudioToolPanelContent,
} from "./studio.types"

export const studioRailItems: StudioRailItem[] = [
  { id: "media", label: "Media", icon: Clapperboard },
  { id: "assets", label: "Assets", icon: FolderOpen },
  { id: "text", label: "Text", icon: Type },
  { id: "captions", label: "Captions", icon: Captions },
  { id: "chapters", label: "Chapters", icon: ListTree },
  { id: "audio", label: "Audio", icon: AudioLines },
  { id: "clips", label: "Clips", icon: Scissors },
  { id: "ai", label: "AI", icon: Sparkles },
]

export const studioTextFontOptions: Array<{
  label: string
  value: StudioTextFontFamily
}> = [
  { label: "Geist", value: "geist" },
  { label: "Montserrat", value: "montserrat" },
  { label: "Bebas Neue", value: "bebas-neue" },
  { label: "Anton", value: "anton" },
  { label: "Playfair Display", value: "playfair-display" },
  { label: "Caveat", value: "caveat" },
  { label: "Roboto Mono", value: "roboto-mono" },
]

export const studioTextAnimationOptions: Array<{
  label: string
  value: StudioTextAnimationName
}> = [
  { label: "None", value: "none" },
  { label: "Fade In", value: "fadeIn" },
  { label: "Blur In", value: "blurIn" },
  { label: "Blur In Up", value: "blurInUp" },
  { label: "Blur In Down", value: "blurInDown" },
  { label: "Slide Up", value: "slideUp" },
  { label: "Slide Down", value: "slideDown" },
  { label: "Slide Left", value: "slideLeft" },
  { label: "Slide Right", value: "slideRight" },
  { label: "Scale Up", value: "scaleUp" },
  { label: "Scale Down", value: "scaleDown" },
]

export const studioTextAnimationByOptions: Array<{
  label: string
  value: StudioTextAnimationBy
}> = [
  { label: "Text", value: "text" },
  { label: "Word", value: "word" },
  { label: "Character", value: "character" },
  { label: "Line", value: "line" },
]

export const studioTextPresets: StudioTextPreset[] = [
  {
    id: "hook-title",
    category: "TITLES",
    label: "Hook Title",
    previewText: "The fastest way to repurpose a keynote",
    styleSummary: "Bold opener",
    className:
      "absolute left-[8%] top-[16%] max-w-[46%] rounded-xl px-4 py-3 leading-tight shadow-xl transition",
    frameClassName:
      "absolute left-[8%] top-[16%] h-[21%] w-[46%] rounded-2xl border border-sky-300/90 shadow-[0_0_0_1px_rgba(125,211,252,0.2)]",
    defaultStyle: {
      animationBy: "word",
      animationDuration: 0.8,
      animationName: "blurInUp",
      backgroundColor: "#101010",
      backgroundRadius: 18,
      backgroundStyle: "box",
      boxWidth: 46,
      fontFamily: "anton",
      fontSize: 18,
      fontStyle: "normal",
      fontWeight: "bold",
      textAlign: "left",
      textColor: "#ffffff",
    },
  },
  {
    id: "subtitle-line",
    category: "TITLES",
    label: "Subtitle",
    previewText: "Turn long-form recordings into reusable assets.",
    styleSummary: "Small support copy",
    className:
      "absolute left-[8%] top-[39%] max-w-[42%] rounded-lg px-3 py-2 leading-snug shadow-lg transition",
    frameClassName:
      "absolute left-[8%] top-[39%] h-[11%] w-[42%] rounded-xl border border-sky-300/90 shadow-[0_0_0_1px_rgba(125,211,252,0.2)]",
    defaultStyle: {
      animationBy: "text",
      animationDuration: 0.5,
      animationName: "fadeIn",
      backgroundColor: "#101010",
      backgroundRadius: 14,
      backgroundStyle: "shadow",
      boxWidth: 42,
      fontFamily: "montserrat",
      fontSize: 13,
      fontStyle: "normal",
      fontWeight: "regular",
      textAlign: "left",
      textColor: "#ffffff",
    },
  },
  {
    id: "cta-pill",
    category: "SOCIAL",
    label: "CTA",
    previewText: "Save this workflow",
    styleSummary: "Compact social CTA",
    className:
      "absolute right-[9%] bottom-[12%] rounded-full px-4 py-2 leading-none shadow-xl transition",
    frameClassName:
      "absolute right-[9%] bottom-[12%] h-[9%] w-[24%] rounded-full border border-sky-300/90 shadow-[0_0_0_1px_rgba(125,211,252,0.2)]",
    defaultStyle: {
      animationBy: "word",
      animationDuration: 0.6,
      animationName: "scaleUp",
      backgroundColor: "#101010",
      backgroundRadius: 999,
      backgroundStyle: "box",
      boxWidth: 24,
      fontFamily: "montserrat",
      fontSize: 14,
      fontStyle: "normal",
      fontWeight: "bold",
      textAlign: "center",
      textColor: "#ffffff",
    },
  },
  {
    id: "quote-card",
    category: "SOCIAL",
    label: "Quote",
    previewText: "Transcript quality decides everything downstream.",
    styleSummary: "Editorial quote",
    className:
      "absolute inset-x-[18%] top-[22%] rounded-xl px-5 py-4 text-center leading-tight shadow-xl transition",
    frameClassName:
      "absolute inset-x-[18%] top-[22%] h-[24%] rounded-2xl border border-sky-300/90 shadow-[0_0_0_1px_rgba(125,211,252,0.2)]",
    defaultStyle: {
      animationBy: "line",
      animationDuration: 0.8,
      animationName: "blurIn",
      backgroundColor: "#101010",
      backgroundRadius: 20,
      backgroundStyle: "box",
      boxWidth: 64,
      fontFamily: "playfair-display",
      fontSize: 17,
      fontStyle: "italic",
      fontWeight: "bold",
      textAlign: "center",
      textColor: "#ffffff",
    },
  },
  {
    id: "name-lower-third",
    category: "LOWER_THIRDS",
    label: "Name Lower Third",
    previewText: "Alex Morgan · Product Lead",
    styleSummary: "Speaker ID",
    className:
      "absolute left-[8%] bottom-[18%] max-w-[44%] rounded-lg px-4 py-2 leading-snug shadow-lg transition",
    frameClassName:
      "absolute left-[8%] bottom-[18%] h-[10%] w-[38%] rounded-xl border border-sky-300/90 shadow-[0_0_0_1px_rgba(125,211,252,0.2)]",
    defaultStyle: {
      animationBy: "word",
      animationDuration: 0.6,
      animationName: "slideLeft",
      backgroundColor: "#101010",
      backgroundRadius: 12,
      backgroundStyle: "box",
      boxWidth: 38,
      fontFamily: "montserrat",
      fontSize: 13,
      fontStyle: "normal",
      fontWeight: "bold",
      textAlign: "left",
      textColor: "#ffffff",
    },
  },
  {
    id: "label-tag",
    category: "CALLOUTS",
    label: "Label",
    previewText: "AI CLIP FINDER",
    styleSummary: "Small label",
    className:
      "absolute right-[10%] top-[12%] rounded-md px-3 py-1.5 leading-none shadow-lg transition",
    frameClassName:
      "absolute right-[10%] top-[12%] h-[8%] w-[22%] rounded-lg border border-sky-300/90 shadow-[0_0_0_1px_rgba(125,211,252,0.2)]",
    defaultStyle: {
      animationBy: "character",
      animationDuration: 0.6,
      animationName: "slideDown",
      backgroundColor: "#101010",
      backgroundRadius: 10,
      backgroundStyle: "shadow",
      boxWidth: 22,
      fontFamily: "roboto-mono",
      fontSize: 11,
      fontStyle: "normal",
      fontWeight: "bold",
      textAlign: "center",
      textColor: "#ffffff",
    },
  },
]

function createTranscriptWords(segments: StudioTranscriptSegment[]) {
  let runningWordIndex = 0

  return segments.flatMap<StudioTranscriptWord>((segment) => {
    const tokens = segment.text.split(/\s+/)
    const wordDuration = (segment.endTime - segment.startTime) / Math.max(tokens.length, 1)

    return tokens.map((token, tokenIndex) => {
      const startTime = Number((segment.startTime + tokenIndex * wordDuration).toFixed(2))
      const endTime = Number(
        (tokenIndex === tokens.length - 1
          ? segment.endTime
          : segment.startTime + (tokenIndex + 1) * wordDuration
        ).toFixed(2)
      )

      const nextWord: StudioTranscriptWord = {
        id: `word_${String(runningWordIndex + 1).padStart(3, "0")}`,
        segmentId: segment.id,
        wordIndex: runningWordIndex,
        startTime,
        endTime,
        sourceText: token,
        text: token,
        confidence: segment.confidence,
      }

      runningWordIndex += 1

      return nextWord
    })
  })
}

const transcriptSegments: StudioTranscriptSegment[] = [
  {
    id: "segment_001",
    segmentIndex: 0,
    startTime: 0,
    endTime: 8.2,
    text: "Today we are showing how teams can ship short-form content faster from one source recording.",
    speakerLabel: "Speaker 1",
    confidence: 0.98,
  },
  {
    id: "segment_002",
    segmentIndex: 1,
    startTime: 8.2,
    endTime: 15.6,
    text: "The workflow starts with a clean transcript before anything downstream becomes useful.",
    speakerLabel: "Speaker 1",
    confidence: 0.97,
  },
  {
    id: "segment_003",
    segmentIndex: 2,
    startTime: 15.6,
    endTime: 24.3,
    text: "Once the wording is right, chaptering and clip selection stop drifting away from the actual message.",
    speakerLabel: "Speaker 1",
    confidence: 0.96,
  },
  {
    id: "segment_004",
    segmentIndex: 3,
    startTime: 24.3,
    endTime: 33.4,
    text: "That gives the team something they can review, publish, and reuse without re-uploading the source video.",
    speakerLabel: "Speaker 2",
    confidence: 0.95,
  },
]

const transcriptWords = createTranscriptWords(transcriptSegments)
const transcriptFullText = transcriptSegments.map((segment) => segment.text).join(" ")

export const studioEditorProject: StudioEditorProject = {
  media: {
    id: "media_001",
    title: "Launch Keynote Full Session",
    thumbnailUrl: "/window.svg",
    durationSeconds: 1864,
    durationLabel: "31:04",
    status: "UPLOADED",
    type: "VIDEO",
    width: 1920,
    height: 1080,
    streamUrl: "https://example.com/media/launch-keynote.m3u8",
  },
  projectMedia: [
    {
      id: "source-media",
      type: "VIDEO",
      name: "Keynote_source_v3.mp4",
      summary: "Main interview source for the current edit.",
      origin: "SOURCE",
      status: "READY",
      format: "MP4",
      metadata: "31:04 · 1920x1080 · 24 fps",
      usageLabel: "Main source",
      durationLabel: "31:04",
      resolutionLabel: "1920x1080",
      sizeLabel: "1.8 GB",
      linkedSelectionId: "source-media",
      startTime: 0,
    },
    {
      id: "media-b-roll",
      type: "VIDEO",
      name: "product-demo-broll.mov",
      summary: "Secondary product footage available for overlays or inserts.",
      origin: "LIBRARY",
      status: "READY",
      format: "MOV",
      metadata: "01:12 · 1080p",
      usageLabel: "Project media",
      durationLabel: "01:12",
      resolutionLabel: "1920x1080",
      sizeLabel: "420 MB",
    },
    {
      id: "media-guide-audio",
      type: "AUDIO",
      name: "english-guide-track.m4a",
      summary: "Clean guide audio linked to the timeline audio bed.",
      origin: "UPLOAD",
      status: "READY",
      format: "M4A",
      metadata: "31:04 · stereo · -3 dB",
      usageLabel: "Audio bed",
      durationLabel: "31:04",
      sizeLabel: "74 MB",
      linkedSelectionId: "audio-bed",
      startTime: 0,
    },
    {
      id: "media-music-bed",
      type: "AUDIO",
      name: "soft-launch-bed.wav",
      summary: "Background music ready for the Audio tab.",
      origin: "LIBRARY",
      status: "READY",
      format: "WAV",
      metadata: "02:40 · loopable · -18 dB",
      usageLabel: "Music",
      durationLabel: "02:40",
      sizeLabel: "48 MB",
    },
    {
      id: "media-brand-mark",
      type: "IMAGE",
      name: "brand-mark-white.png",
      summary: "Logo image already placed on the canvas.",
      origin: "UPLOAD",
      status: "READY",
      format: "PNG",
      metadata: "Transparent · 1200x400",
      usageLabel: "Canvas layer",
      dimensionsLabel: "1200x400",
      sizeLabel: "820 KB",
      linkedSelectionId: "brand-mark",
    },
    {
      id: "media-still-desk",
      type: "IMAGE",
      name: "desk-close-up.jpg",
      summary: "Marked still frame available for thumbnail or overlay use.",
      origin: "LIBRARY",
      status: "READY",
      format: "JPG",
      metadata: "3840x2160 · marked",
      usageLabel: "Still frame",
      dimensionsLabel: "3840x2160",
      sizeLabel: "2.4 MB",
    },
  ],
  transcript: {
    id: "transcript_001",
    language: "English",
    version: 4,
    wordCount: transcriptWords.length,
    isEdited: false,
    fullText: transcriptFullText,
    source: "Whisper large-v3",
    createdAt: "2026-06-11T09:15:00.000Z",
  },
  transcriptSegments,
  transcriptWords,
  chapters: [
    {
      id: "chapter_001",
      chapterIndex: 1,
      startTime: 0,
      endTime: 92,
      title: "Why transcript quality matters",
      summary: "Frames the transcript as the source of truth for downstream content quality.",
      transcriptVersion: 3,
      score: 0.91,
    },
    {
      id: "chapter_002",
      chapterIndex: 2,
      startTime: 92,
      endTime: 224,
      title: "Reusable content pipeline",
      summary: "Explains how chapters and clips stack on top of one long-form recording.",
      transcriptVersion: 3,
      score: 0.88,
    },
  ],
  clipCandidates: [
    {
      id: "candidate_001",
      startTime: 12,
      endTime: 42,
      duration: 30,
      text: "The workflow starts with a clean transcript before anything downstream becomes useful.",
      finalScore: 0.92,
      hookScore: 0.87,
      status: "SELECTED",
      transcriptVersion: 3,
    },
    {
      id: "candidate_002",
      startTime: 104,
      endTime: 138,
      duration: 34,
      text: "Once the wording is right, chaptering and clip selection stop drifting away from the actual message.",
      finalScore: 0.89,
      hookScore: 0.84,
      status: "CANDIDATE",
      transcriptVersion: 4,
    },
  ],
  shortClips: [
    {
      id: "short_clip_001",
      title: "Transcript before everything",
      caption: "Why transcript cleanup pays off before chapters and clips.",
      duration: 30,
      status: "READY",
      videoPath: "short-clips/launch-keynote/clip-001.mp4",
      thumbnailPath: "short-clips/launch-keynote/clip-001.jpg",
      aspectRatio: "9:16",
      transcriptVersion: 3,
    },
  ],
  generatedAssets: [
    {
      id: "asset_001",
      assetType: "SRT",
      label: "English subtitles",
      status: "READY",
      transcriptVersion: 3,
    },
    {
      id: "asset_002",
      assetType: "BURNED_SUBTITLE_VIDEO",
      label: "Burned subtitle preview",
      status: "READY",
      transcriptVersion: 4,
    },
  ],
  processingJobs: [
    {
      id: "job_001",
      jobType: "TRANSCRIPT",
      status: "COMPLETED",
      progress: 100,
      currentStep: "Transcript saved",
    },
    {
      id: "job_002",
      jobType: "CHAPTERS",
      status: "COMPLETED",
      progress: 100,
      currentStep: "Chapters generated from transcript v3",
    },
    {
      id: "job_003",
      jobType: "CLIPS",
      status: "RUNNING",
      progress: 62,
      currentStep: "Rendering vertical exports",
    },
  ],
  sourceMedia: {
    id: "source-media",
    name: "Keynote_source_v3.mp4",
    durationLabel: "31:04",
    resolutionLabel: "1080p",
    summary: "Main interview source",
  },
  layers: [
    {
      id: "brand-mark",
      kind: "image",
      label: "Brand mark",
      summary: "Top-left image layer",
      className:
        "absolute left-[8%] top-[9%] rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-[11px] font-medium text-white shadow-lg backdrop-blur-sm transition",
      frameClassName:
        "absolute left-[7.2%] top-[8.2%] h-[10%] w-[15%] rounded-xl border border-sky-300/90 shadow-[0_0_0_1px_rgba(125,211,252,0.2)]",
    },
    {
      id: "hook-copy",
      kind: "text",
      label: "Hook text",
      summary: "Primary intro headline",
      animationBy: "word",
      animationDuration: 0.8,
      animationName: "blurInUp",
      backgroundColor: "#101010",
      backgroundRadius: 18,
      backgroundStyle: "box",
      boxWidth: 46,
      className:
        "absolute left-[8%] top-[16%] max-w-[44%] rounded-xl px-4 py-3 leading-tight shadow-xl transition",
      content: "The fastest way to repurpose a keynote",
      fontFamily: "anton",
      frameClassName:
        "absolute left-[8%] top-[16%] h-[21%] w-[46%] rounded-2xl border border-sky-300/90 shadow-[0_0_0_1px_rgba(125,211,252,0.2)]",
      fontSize: 18,
      fontStyle: "normal",
      fontWeight: "bold",
      presetId: "hook-title",
      textAlign: "left",
      textColor: "#ffffff",
    },
    {
      id: "captions",
      kind: "captions",
      label: "Live caption preview",
      summary: "Caption layer near lower safe area",
      className:
        "absolute inset-x-[18%] bottom-[10%] rounded-xl bg-black/72 px-4 py-3 text-center text-sm font-medium text-white shadow-xl transition",
      frameClassName:
        "absolute inset-x-[17%] bottom-[9%] h-[13%] rounded-2xl border border-sky-300/90 shadow-[0_0_0_1px_rgba(125,211,252,0.2)]",
    },
  ],
  timelineTracks: [
    {
      id: "video",
      label: "Video",
      selectionId: "source-media",
      segments: [
        {
          id: "video-main",
          label: "Source cut",
          widthClassName: "w-[56%]",
          tone: "base",
          selectionId: "source-media",
          summary: "Main interview clip on the primary video track",
          startTime: 0,
        },
      ],
    },
    {
      id: "captions",
      label: "Captions",
      selectionId: "captions",
      segments: [
        {
          id: "caption-a",
          label: "Intro lines",
          widthClassName: "w-[24%]",
          offsetClassName: "ml-[10%]",
          tone: "accent",
          selectionId: "captions",
          summary: "Caption block for the opening hook",
          startTime: 8.2,
        },
        {
          id: "caption-b",
          label: "Main phrase",
          widthClassName: "w-[18%]",
          offsetClassName: "ml-[7%]",
          tone: "accent",
          selectionId: "captions",
          summary: "Caption block covering the first talking point",
          startTime: 15.6,
        },
      ],
    },
    {
      id: "overlays",
      label: "Overlays",
      selectionId: "hook-copy",
      segments: [
        {
          id: "overlay-logo",
          label: "Logo",
          widthClassName: "w-[14%]",
          offsetClassName: "ml-[8%]",
          tone: "muted",
          selectionId: "brand-mark",
          summary: "Brand mark entrance layer",
          startTime: 0,
        },
        {
          id: "overlay-title",
          label: "Hook title",
          widthClassName: "w-[20%]",
          offsetClassName: "ml-[12%]",
          tone: "muted",
          selectionId: "hook-copy",
          summary: "Headline text layer timing",
          startTime: 8.2,
        },
      ],
    },
    {
      id: "audio",
      label: "Audio",
      selectionId: "audio-bed",
      segments: [
        {
          id: "audio-bed",
          label: "Bed track",
          widthClassName: "w-[44%]",
          offsetClassName: "ml-[18%]",
          tone: "base",
          selectionId: "audio-bed",
          summary: "English guide track",
          startTime: 0,
        },
      ],
    },
  ],
}

export const studioToolPanels: Record<StudioToolId, StudioToolPanelContent> = {
  media: {
    title: "Media",
    sections: [
      {
        id: "source",
        title: "Source",
        items: [
          {
            id: "source-main",
            label: studioEditorProject.sourceMedia.name,
            meta: `${studioEditorProject.sourceMedia.durationLabel} · ${studioEditorProject.sourceMedia.resolutionLabel}`,
            selectionId: studioEditorProject.sourceMedia.id,
          },
        ],
      },
      {
        id: "imports",
        title: "Imported",
        items: [
          { id: "images", label: "Images", meta: "12 files", selectionId: "brand-mark" },
          { id: "captions", label: "Captions", meta: "2 styles", selectionId: "captions" },
        ],
      },
    ],
  },
  assets: {
    title: "Assets",
    sections: [
      {
        id: "logos",
        title: "Brand",
        items: [
          { id: "logo-1", label: "Primary logo", meta: "PNG", selectionId: "brand-mark" },
          { id: "lower-third", label: "Lower third", meta: "Template" },
        ],
      },
      {
        id: "stills",
        title: "Still frames",
        items: [
          { id: "still-1", label: "Desk close-up", meta: "Marked" },
          { id: "still-2", label: "Wide room", meta: "Draft" },
        ],
      },
    ],
  },
  text: {
    title: "Text",
    sections: [
      {
        id: "headline",
        title: "Headline",
        items: [
          { id: "hook-copy", label: "Hook text", meta: "Selected", selectionId: "hook-copy" },
          { id: "cta-copy", label: "CTA line", meta: "Draft" },
        ],
      },
      {
        id: "styles",
        title: "Styles",
        items: [
          { id: "style-bold", label: "Bold opener", meta: "Preset" },
          { id: "style-clean", label: "Clean quote", meta: "Preset" },
        ],
      },
    ],
  },
  captions: {
    title: "Captions",
    sections: [
      {
        id: "tracks",
        title: "Tracks",
        items: [
          { id: "caption-en", label: "English main", meta: "Active", selectionId: "captions" },
          { id: "caption-burned", label: "Burn-in alt", meta: "Draft" },
        ],
      },
      {
        id: "styles",
        title: "Styles",
        items: [
          { id: "caption-style-1", label: "Bold white", meta: "Applied" },
          { id: "caption-style-2", label: "Minimal dark", meta: "Saved" },
        ],
      },
    ],
  },
  chapters: {
    title: "Chapters",
    sections: [
      {
        id: "outline",
        title: "Outline",
        items: [
          { id: "chapter-item-1", label: "Why transcript quality matters", meta: "0:00-1:32" },
          { id: "chapter-item-2", label: "Reusable content pipeline", meta: "1:32-3:44" },
        ],
      },
      {
        id: "status",
        title: "Status",
        items: [
          { id: "chapter-status", label: "Transcript version", meta: "v4" },
          { id: "chapter-stale", label: "Needs regenerate", meta: "Generated from v3" },
        ],
      },
    ],
  },
  audio: {
    title: "Audio",
    sections: [
      {
        id: "tracks",
        title: "Tracks",
        items: [
          { id: "guide", label: "English guide", meta: "-3 dB", selectionId: "audio-bed" },
          { id: "music", label: "Music bed", meta: "-18 dB" },
        ],
      },
      {
        id: "tools",
        title: "Tools",
        items: [
          { id: "ducking", label: "Ducking", meta: "On" },
          { id: "cleanup", label: "Cleanup", meta: "Ready" },
        ],
      },
    ],
  },
  clips: {
    title: "Clips",
    sections: [
      {
        id: "candidates",
        title: "Candidates",
        items: [
          { id: "clip-1", label: "Hook opener", meta: "0:12-0:42" },
          { id: "clip-2", label: "Objection answer", meta: "1:44-2:18" },
        ],
      },
      {
        id: "exports",
        title: "Exports",
        items: [
          { id: "clip-export-1", label: "9:16 social", meta: "Draft" },
          { id: "clip-export-2", label: "1:1 feed", meta: "Draft" },
        ],
      },
    ],
  },
  ai: {
    title: "AI",
    sections: [
      {
        id: "ideas",
        title: "Ideas",
        items: [
          { id: "ai-1", label: "Hook rewrite", meta: "2 options" },
          { id: "ai-2", label: "Caption polish", meta: "Ready" },
        ],
      },
      {
        id: "automation",
        title: "Automation",
        items: [
          { id: "auto-1", label: "Clip finder", meta: "Queued" },
          { id: "auto-2", label: "Silence trim", meta: "Idle" },
        ],
      },
    ],
  },
}

export function getStudioSelectionById(
  project: StudioEditorProject,
  selectionId: string
): StudioSelection {
  const mediaItem = project.projectMedia.find((item) => item.id === selectionId)

  if (mediaItem) {
    return {
      id: mediaItem.id,
      kind: "media",
      label: mediaItem.name,
      summary: mediaItem.summary,
      detail: mediaItem.usageLabel,
      media: mediaItem,
      linkedSelectionId: mediaItem.linkedSelectionId,
    }
  }

  if (selectionId === project.sourceMedia.id) {
    return {
      id: project.sourceMedia.id,
      kind: "source",
      label: project.sourceMedia.name,
      summary: project.sourceMedia.summary,
    }
  }

  const layer = project.layers.find((item) => item.id === selectionId)

  if (layer) {
    return {
      id: layer.id,
      kind: "layer",
      label: layer.label,
      summary: layer.summary,
      detail:
        layer.kind === "text"
          ? "Canvas layer"
          : layer.kind === "captions"
            ? "Caption layer"
            : "Image layer",
      layer,
    }
  }

  for (const track of project.timelineTracks) {
    const segment = track.segments.find((item) => item.id === selectionId)

    if (segment) {
      return {
        id: segment.id,
        kind: "segment",
        label: segment.label,
        summary: segment.summary,
        detail: "Timeline segment",
        linkedSelectionId: segment.selectionId,
        trackLabel: track.label,
      }
    }
  }

  return {
    id: project.sourceMedia.id,
    kind: "source",
    label: project.sourceMedia.name,
    summary: project.sourceMedia.summary,
  }
}
