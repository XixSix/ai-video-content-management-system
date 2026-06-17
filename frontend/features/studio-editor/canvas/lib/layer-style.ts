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
    layer.backgroundStyle === "none" || layer.backgroundEnabled === false
      ? "transparent"
      : layer.backgroundColor
  const hasPosition =
    typeof layer.xPercent === "number" && typeof layer.yPercent === "number"

  return {
    backgroundColor,
    borderRadius: layer.backgroundRadius,
    boxSizing: "border-box",
    color: layer.textColor,
    fontFamily: getFontFamilyValue(layer.fontFamily),
    fontSize: layer.fontSize,
    fontStyle: layer.fontStyle,
    fontWeight: layer.fontWeight === "bold" ? 700 : 500,
    maxWidth: "none",
    minWidth: layer.boxWidth ? `${Math.min(layer.boxWidth, 92)}%` : undefined,
    overflowWrap: "normal",
    textAlign: layer.textAlign,
    left: hasPosition ? `${layer.xPercent}%` : undefined,
    right: hasPosition ? "auto" : undefined,
    top: hasPosition ? `${layer.yPercent}%` : undefined,
    bottom: hasPosition ? "auto" : undefined,
    transform: hasPosition ? "translate(-50%, -50%)" : undefined,
    width: "max-content",
  }
}

export function getCaptionContainerStyle(
  layer: StudioCanvasLayer
): CSSProperties {
  const hasPosition =
    typeof layer.xPercent === "number" && typeof layer.yPercent === "number"

  return {
    backgroundColor:
      layer.backgroundEnabled === false ? "transparent" : layer.backgroundColor,
    borderRadius: layer.backgroundRadius,
    boxSizing: "border-box",
    color: layer.textColor,
    fontFamily: getFontFamilyValue(layer.fontFamily),
    fontSize: layer.fontSize,
    fontStyle: layer.fontStyle,
    fontWeight: layer.fontWeight === "bold" ? 700 : 500,
    left: hasPosition ? `${layer.xPercent}%` : undefined,
    right: hasPosition ? "auto" : undefined,
    textDecoration: layer.textDecoration,
    textTransform: layer.textTransform,
    top: hasPosition ? `${layer.yPercent}%` : undefined,
    bottom: hasPosition ? "auto" : undefined,
    transform: hasPosition ? "translate(-50%, -50%)" : undefined,
    width: layer.boxWidth ? `${Math.min(layer.boxWidth, 92)}%` : undefined,
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
