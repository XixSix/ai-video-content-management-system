import type { CSSProperties } from "react"

import type { StudioCanvasLayer } from "../../studio.types"

function getFontFamilyValue(fontFamily?: string) {
  const fontFamilyMap: Record<string, string> = {
    geist: "var(--font-geist-sans)",
    montserrat: "var(--font-montserrat)",
    poppins: "var(--font-poppins)",
    oswald: "var(--font-oswald)",
    teko: "var(--font-teko)",
    "bebas-neue": "var(--font-bebas-neue)",
    anton: "var(--font-anton)",
    "playfair-display": "var(--font-playfair-display)",
    caveat: "var(--font-caveat)",
    "roboto-mono": "var(--font-roboto-mono)",
  }

  return fontFamily ? fontFamilyMap[fontFamily] : undefined
}

export function getTextLayerClassName(backgroundStyle?: string) {
  if (backgroundStyle === "none") {
    return "shadow-none"
  }

  if (backgroundStyle === "shadow") {
    return "backdrop-blur-sm"
  }

  return ""
}

export function getTextLayerStyle(layer: StudioCanvasLayer): CSSProperties {
  const backgroundColor =
    layer.backgroundStyle === "none" ? "transparent" : layer.backgroundColor

  return {
    backgroundColor,
    borderRadius: layer.backgroundRadius,
    color: layer.textColor,
    fontFamily: getFontFamilyValue(layer.fontFamily),
    fontSize: layer.fontSize,
    fontStyle: layer.fontStyle,
    fontWeight: layer.fontWeight === "bold" ? 700 : 500,
    textAlign: layer.textAlign,
    width: layer.boxWidth ? `${layer.boxWidth}%` : undefined,
  }
}

export function getCaptionContainerStyle(
  layer: StudioCanvasLayer
): CSSProperties {
  return {
    backgroundColor:
      layer.backgroundEnabled === false ? "transparent" : layer.backgroundColor,
    borderRadius: layer.backgroundRadius,
    color: layer.textColor,
    fontFamily: getFontFamilyValue(layer.fontFamily),
    fontSize: layer.fontSize,
    fontStyle: layer.fontStyle,
    fontWeight: layer.fontWeight === "bold" ? 700 : 500,
    textDecoration: layer.textDecoration,
    textTransform: layer.textTransform,
  }
}

export function getCaptionWordStyle(
  layer: StudioCanvasLayer,
  isActive: boolean
): CSSProperties {
  const strokeWidth = layer.strokeEnabled
    ? `${layer.strokeWidth ?? 0}px`
    : undefined
  const textShadow = layer.shadowEnabled
    ? layer.shadowStyle === "hard"
      ? "0 2px 0 rgba(0,0,0,0.45), 0 0 16px rgba(0,0,0,0.32)"
      : "0 1px 10px rgba(0,0,0,0.3)"
    : undefined

  return {
    WebkitTextStroke: strokeWidth
      ? `${strokeWidth} ${layer.strokeColor ?? "#000000"}`
      : undefined,
    backgroundColor:
      isActive && layer.highlightEnabled
        ? `${layer.highlightColor ?? "#3bff68"}20`
        : undefined,
    borderBottom:
      layer.textDecoration === "underline"
        ? `2px solid ${isActive && layer.highlightEnabled ? layer.highlightColor ?? layer.textColor ?? "#ffffff" : layer.textColor ?? "#ffffff"}`
        : undefined,
    borderRadius: isActive && layer.highlightEnabled ? 10 : undefined,
    boxDecorationBreak: isActive && layer.highlightEnabled ? "clone" : undefined,
    color: isActive && layer.highlightEnabled ? layer.highlightColor : layer.textColor,
    fontStyle: layer.fontStyle,
    paddingBottom: layer.textDecoration === "underline" ? "0.06em" : undefined,
    paddingInline: isActive && layer.highlightEnabled ? "0.18em" : undefined,
    textShadow,
  }
}
