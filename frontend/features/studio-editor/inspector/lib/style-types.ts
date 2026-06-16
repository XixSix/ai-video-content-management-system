import type { StudioCanvasLayer } from "@/features/studio-editor/studio.types"

export type CaptionLayerStyleUpdate = Partial<
  Pick<
    StudioCanvasLayer,
    | "animationBy"
    | "animationDuration"
    | "animationName"
    | "backgroundEnabled"
    | "backgroundColor"
    | "backgroundRadius"
    | "enabled"
    | "fontFamily"
    | "fontSize"
    | "fontStyle"
    | "fontWeight"
    | "highlightColor"
    | "highlightEnabled"
    | "presetId"
    | "shadowEnabled"
    | "shadowStyle"
    | "strokeColor"
    | "strokeEnabled"
    | "strokeWidth"
    | "textColor"
    | "textDecoration"
    | "textTransform"
  >
>

export type TextLayerStyleUpdate = Partial<
  Pick<
    StudioCanvasLayer,
    | "animationBy"
    | "animationDuration"
    | "animationName"
    | "backgroundEnabled"
    | "backgroundColor"
    | "backgroundRadius"
    | "backgroundStyle"
    | "boxWidth"
    | "fontFamily"
    | "fontSize"
    | "fontStyle"
    | "fontWeight"
    | "textAlign"
    | "textColor"
  >
>
