import {
  AudioLines,
  Captions,
  Clapperboard,
  FolderOpen,
  Scissors,
  Sparkles,
  Type,
} from "lucide-react"

import type {
  StudioEditorProject,
  StudioRailItem,
  StudioSelection,
  StudioToolId,
  StudioToolPanelContent,
} from "./studio.types"

export const studioRailItems: StudioRailItem[] = [
  { id: "media", label: "Media", icon: Clapperboard },
  { id: "assets", label: "Assets", icon: FolderOpen },
  { id: "text", label: "Text", icon: Type },
  { id: "captions", label: "Captions", icon: Captions },
  { id: "audio", label: "Audio", icon: AudioLines },
  { id: "clips", label: "Clips", icon: Scissors },
  { id: "ai", label: "AI", icon: Sparkles },
]

export const studioEditorProject: StudioEditorProject = {
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
      className:
        "absolute left-[8%] top-[16%] max-w-[44%] rounded-xl bg-black/58 px-4 py-3 text-lg font-semibold leading-tight text-white shadow-xl transition",
      frameClassName:
        "absolute left-[8%] top-[16%] h-[21%] w-[46%] rounded-2xl border border-sky-300/90 shadow-[0_0_0_1px_rgba(125,211,252,0.2)]",
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
        },
        {
          id: "caption-b",
          label: "Main phrase",
          widthClassName: "w-[18%]",
          offsetClassName: "ml-[7%]",
          tone: "accent",
          selectionId: "captions",
          summary: "Caption block covering the first talking point",
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
        },
        {
          id: "overlay-title",
          label: "Hook title",
          widthClassName: "w-[20%]",
          offsetClassName: "ml-[12%]",
          tone: "muted",
          selectionId: "hook-copy",
          summary: "Headline text layer timing",
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
          { id: "clip-1", label: "Hook opener", meta: "0:12", selectionId: "overlay-title" },
          { id: "clip-2", label: "Objection answer", meta: "0:29" },
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

export function getStudioSelectionById(selectionId: string): StudioSelection {
  if (selectionId === studioEditorProject.sourceMedia.id) {
    return {
      id: studioEditorProject.sourceMedia.id,
      kind: "source",
      label: studioEditorProject.sourceMedia.name,
      summary: studioEditorProject.sourceMedia.summary,
    }
  }

  const layer = studioEditorProject.layers.find((item) => item.id === selectionId)

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
    }
  }

  for (const track of studioEditorProject.timelineTracks) {
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
    id: studioEditorProject.sourceMedia.id,
    kind: "source",
    label: studioEditorProject.sourceMedia.name,
    summary: studioEditorProject.sourceMedia.summary,
  }
}
