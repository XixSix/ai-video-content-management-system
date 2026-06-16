import type {
  StudioTextAnimationBy,
  StudioTextAnimationName,
  StudioTextFontFamily,
  StudioTextPreset,
} from "../studio.types"

export const studioTextFontOptions: Array<{
  label: string
  value: StudioTextFontFamily
}> = [
  { label: "Geist", value: "geist" },
  { label: "Montserrat", value: "montserrat" },
  { label: "Poppins", value: "poppins" },
  { label: "Oswald", value: "oswald" },
  { label: "Teko", value: "teko" },
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
