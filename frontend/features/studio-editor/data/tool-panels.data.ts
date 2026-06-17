import type {
  StudioEditorProject,
  StudioToolId,
  StudioToolPanelContent,
} from "../studio.types"

export function getStudioToolPanels(
  project: StudioEditorProject
): Record<StudioToolId, StudioToolPanelContent> {
  return {
    media: {
      title: "Media",
      sections: [
        {
          id: "source",
          title: "Source",
          items: [
            {
              id: "source-main",
              label: project.sourceMedia.name,
              meta: `${project.sourceMedia.durationLabel} · ${project.sourceMedia.resolutionLabel}`,
              selectionId: project.sourceMedia.id,
            },
          ],
        },
        {
          id: "imports",
          title: "Imported",
          items: [
            { id: "captions", label: "Captions", meta: "2 styles", selectionId: "captions" },
          ],
        },
      ],
    },
    assets: {
      title: "Assets",
      sections: [],
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
      sections: [],
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
      sections: [],
    },
  }
}
