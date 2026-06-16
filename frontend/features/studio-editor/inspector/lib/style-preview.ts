import type { CSSProperties } from "react"

export function getFontPreviewStyle(value: string | undefined): CSSProperties {
  return {
    fontFamily:
      value === "montserrat"
        ? "var(--font-montserrat)"
        : value === "poppins"
          ? "var(--font-poppins)"
          : value === "oswald"
            ? "var(--font-oswald)"
            : value === "teko"
              ? "var(--font-teko)"
              : value === "bebas-neue"
                ? "var(--font-bebas-neue)"
                : value === "anton"
                  ? "var(--font-anton)"
                  : value === "playfair-display"
                    ? "var(--font-playfair-display)"
                    : value === "caveat"
                      ? "var(--font-caveat)"
                      : value === "roboto-mono"
                        ? "var(--font-roboto-mono)"
                        : "var(--font-geist-sans)",
  }
}

export function getCaptionPreviewTextStyle(style: {
  backgroundEnabled?: boolean
  fontFamily?: string
  fontSize?: number
  fontStyle?: string
  fontWeight?: string
  highlightEnabled?: boolean
  highlightColor?: string
  shadowEnabled?: boolean
  shadowStyle?: "soft" | "hard"
  strokeEnabled?: boolean
  strokeColor?: string
  strokeWidth?: number
  textColor?: string
  textDecoration?: string
  textTransform?: string
}): CSSProperties {
  return {
    WebkitTextStroke: style.strokeEnabled
      ? `${style.strokeWidth ?? 0}px ${style.strokeColor ?? "#000000"}`
      : undefined,
    color: style.textColor,
    fontFamily: getFontPreviewStyle(style.fontFamily).fontFamily,
    fontSize: style.fontSize ? Math.max(15, style.fontSize - 2) : 18,
    fontStyle: style.fontStyle === "italic" ? "italic" : undefined,
    fontWeight: style.fontWeight === "bold" ? 700 : 500,
    borderBottom:
      style.textDecoration === "underline"
        ? `2px solid ${style.textColor ?? "#ffffff"}`
        : undefined,
    paddingBottom: style.textDecoration === "underline" ? "0.06em" : undefined,
    textShadow: style.shadowEnabled
      ? style.shadowStyle === "hard"
        ? "0 2px 0 rgba(0,0,0,0.45), 0 0 14px rgba(0,0,0,0.28)"
        : "0 1px 10px rgba(0,0,0,0.26)"
      : undefined,
    textTransform: style.textTransform === "uppercase" ? "uppercase" : undefined,
  }
}

export function getCaptionPreviewChipStyle(style: {
  backgroundEnabled?: boolean
  backgroundColor?: string
  backgroundRadius?: number
  enabled?: boolean
}): CSSProperties {
  return {
    backgroundColor:
      style.enabled && style.backgroundEnabled !== false
        ? style.backgroundColor ?? "#111111"
        : "transparent",
    borderRadius: style.backgroundRadius ?? 16,
    paddingBlock: "0.38rem",
    paddingInline: "0.7rem",
  }
}
