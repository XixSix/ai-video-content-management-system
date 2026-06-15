"use client"

import Image from "next/image"
import type { CSSProperties } from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import { TextAnimate } from "@/components/ui/text-animate"
import { buildCaptionCues } from "@/features/studio-editor/studio-captions"
import { useStudioEditor } from "@/features/studio-editor/studio-editor-context"
import type { StudioCanvasLayer, StudioCaptionWordGroup } from "@/features/studio-editor/studio.types"
import { cn } from "@/lib/utils"

const VIDEO_ASPECT_RATIO = 16 / 9
const CANVAS_HORIZONTAL_PADDING = 56
const CANVAS_VERTICAL_PADDING = 48

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

function getTextLayerClassName(backgroundStyle?: string) {
  if (backgroundStyle === "none") {
    return "shadow-none"
  }

  if (backgroundStyle === "shadow") {
    return "backdrop-blur-sm"
  }

  return ""
}

function getTextLayerStyle(layer: StudioCanvasLayer): CSSProperties {
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

function getCaptionContainerStyle(layer: StudioCanvasLayer): CSSProperties {
  return {
    backgroundColor: layer.backgroundEnabled === false ? "transparent" : layer.backgroundColor,
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

function getCaptionWordStyle(
  layer: StudioCanvasLayer,
  isActive: boolean
): CSSProperties {
  const strokeWidth = layer.strokeEnabled ? `${layer.strokeWidth ?? 0}px` : undefined
  const textShadow = layer.shadowEnabled
    ? layer.shadowStyle === "hard"
      ? "0 2px 0 rgba(0,0,0,0.45), 0 0 16px rgba(0,0,0,0.32)"
      : "0 1px 10px rgba(0,0,0,0.3)"
    : undefined

  return {
    WebkitTextStroke: strokeWidth ? `${strokeWidth} ${layer.strokeColor ?? "#000000"}` : undefined,
    backgroundColor:
      isActive && layer.highlightEnabled ? `${layer.highlightColor ?? "#3bff68"}20` : undefined,
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

function isCueActive(
  cue: ReturnType<typeof buildCaptionCues>[number],
  currentTime: number
) {
  return currentTime >= cue.startTime && currentTime <= cue.endTime
}

function isWordGroupActive(wordGroup: StudioCaptionWordGroup, currentTime: number) {
  return currentTime >= wordGroup.startTime && currentTime <= wordGroup.endTime
}

function CaptionWord({
  index,
  isActive,
  layer,
  wordGroup,
}: {
  index: number
  isActive: boolean
  layer: StudioCanvasLayer
  wordGroup: StudioCaptionWordGroup
}) {
  const displayText =
    layer.textTransform === "uppercase"
      ? wordGroup.text.toUpperCase()
      : wordGroup.text

  if (layer.animationName && layer.animationName !== "none") {
    return (
      <span
        className={cn("inline-block", index === 0 ? "" : "ml-[0.28em]")}
        style={getCaptionWordStyle(layer, isActive)}
      >
        <TextAnimate
          key={`${wordGroup.id}-${layer.animationName}-${layer.animationBy}-${layer.animationDuration}-${displayText}`}
          animation={layer.animationName}
          by={layer.animationBy}
          duration={layer.animationDuration}
          as="span"
          startOnView={false}
          className="inline-block"
          segmentClassName="inline-block whitespace-pre-wrap"
        >
          {displayText}
        </TextAnimate>
      </span>
    )
  }

  return (
    <span
      className={cn("inline-block", index === 0 ? "" : "ml-[0.28em]")}
      style={getCaptionWordStyle(layer, isActive)}
    >
      {displayText}
    </span>
  )
}

export function StudioCanvas() {
  const {
    currentTime,
    project,
    selectedItem,
    selectedTargetId,
    setActiveTool,
    setSelectedItemId,
  } = useStudioEditor()
  const isSourceSelected = selectedTargetId === project.sourceMedia.id
  const canvasAreaRef = useRef<HTMLDivElement>(null)
  const [previewSize, setPreviewSize] = useState<{
    height: number
    width: number
  } | null>(null)

  const captionCues = useMemo(
    () => buildCaptionCues(project.transcriptSegments, project.transcriptWords),
    [project.transcriptSegments, project.transcriptWords]
  )

  useEffect(() => {
    const canvasArea = canvasAreaRef.current

    if (!canvasArea) {
      return
    }

    const updatePreviewSize = () => {
      const { height, width } = canvasArea.getBoundingClientRect()
      const availableHeight = Math.max(0, height - CANVAS_VERTICAL_PADDING)
      const availableWidth = Math.max(0, width - CANVAS_HORIZONTAL_PADDING)
      const nextWidth = Math.max(
        0,
        Math.min(availableWidth, availableHeight * VIDEO_ASPECT_RATIO)
      )
      const nextHeight = nextWidth / VIDEO_ASPECT_RATIO

      setPreviewSize((currentSize) => {
        const roundedWidth = Math.round(nextWidth)
        const roundedHeight = Math.round(nextHeight)

        if (
          currentSize?.width === roundedWidth &&
          currentSize?.height === roundedHeight
        ) {
          return currentSize
        }

        return {
          height: roundedHeight,
          width: roundedWidth,
        }
      })
    }

    updatePreviewSize()

    const resizeObserver = new ResizeObserver(updatePreviewSize)
    resizeObserver.observe(canvasArea)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(125,125,125,0.1),transparent_42%),linear-gradient(180deg,color-mix(in_srgb,var(--background)_92%,black_8%),var(--background))]">
      <div
        ref={canvasAreaRef}
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-7 py-6"
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <div
            data-studio-canvas-preview=""
            onClick={() => {
              setActiveTool("media")
              setSelectedItemId(project.sourceMedia.id)
            }}
            className={cn(
              "relative aspect-video max-h-full max-w-full overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(145deg,#1e7397,#0c4364_55%,#092c43)] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.55)]",
              isSourceSelected ? "ring-2 ring-sky-300/75 ring-offset-0" : null
            )}
            style={{
              height: previewSize?.height,
              width: previewSize?.width ?? "100%",
            }}
          >
            {project.media.thumbnailUrl ? (
              <Image
                src={project.media.thumbnailUrl}
                alt=""
                fill
                sizes="70vw"
                className="absolute inset-0 object-cover"
                priority
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.15))]" />
                <div className="absolute left-[11%] top-[19%] size-[24%] rounded-full bg-[rgba(0,0,0,0.16)] blur-3xl" />
                <div className="absolute right-[9%] top-[9%] h-[43%] w-[21%] rounded-[18px] border border-white/12 bg-[rgba(3,10,15,0.28)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
                <div className="absolute left-[16%] top-[28%] h-[56%] w-[18%] rounded-[22px] bg-[rgba(255,255,255,0.18)] blur-[2px]" />
                <div className="absolute right-[10%] top-[34%] h-[48%] w-[20%] rounded-[22px] bg-[rgba(0,0,0,0.18)] blur-[2px]" />
              </>
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.18))]" />

            {project.layers.map((layer) => {
              const isSelected = selectedTargetId === layer.id
              const activeCue =
                layer.kind === "captions"
                  ? captionCues.find((cue) => isCueActive(cue, currentTime)) ?? null
                  : null

              if (layer.kind === "captions" && !layer.enabled) {
                return null
              }

              return (
                <button
                  key={layer.id}
                  type="button"
                  aria-label={layer.label}
                  onClick={(event) => {
                    event.stopPropagation()
                    setActiveTool(
                      layer.kind === "text"
                        ? "text"
                        : layer.kind === "captions"
                          ? "captions"
                          : "assets"
                    )
                    setSelectedItemId(layer.id)
                  }}
                  className={cn(
                    layer.className,
                    "text-left",
                    layer.kind === "text"
                      ? getTextLayerClassName(layer.backgroundStyle)
                      : layer.kind === "captions"
                        ? "flex items-center justify-center"
                        : null,
                    isSelected
                      ? "ring-2 ring-sky-300/75 ring-offset-0"
                      : "hover:ring-2 hover:ring-white/20"
                  )}
                  style={
                    layer.kind === "text"
                      ? getTextLayerStyle(layer)
                      : layer.kind === "captions"
                        ? getCaptionContainerStyle(layer)
                        : undefined
                  }
                >
                  {layer.kind === "text" ? (
                    layer.animationName && layer.animationName !== "none" ? (
                      <TextAnimate
                        key={`${layer.id}-${layer.animationName}-${layer.animationBy}-${layer.animationDuration}-${layer.content ?? ""}`}
                        animation={layer.animationName}
                        by={layer.animationBy}
                        duration={layer.animationDuration}
                        as="span"
                        startOnView={false}
                        className="block whitespace-pre-wrap"
                        segmentClassName="whitespace-pre-wrap"
                      >
                        {layer.content ?? layer.label}
                      </TextAnimate>
                    ) : (
                      <span className="block whitespace-pre-wrap">
                        {layer.content ?? layer.label}
                      </span>
                    )
                  ) : layer.kind === "captions" ? (
                    activeCue ? (
                      <span className="block max-w-full text-center leading-[1.02]">
                        {activeCue.wordGroups.map((wordGroup, index) => (
                          <CaptionWord
                            key={wordGroup.id}
                            index={index}
                            isActive={isWordGroupActive(wordGroup, currentTime)}
                            layer={layer}
                            wordGroup={wordGroup}
                          />
                        ))}
                      </span>
                    ) : null
                  ) : (
                    layer.label
                  )}
                </button>
              )
            })}

            {selectedItem.kind !== "source"
              ? project.layers
                  .filter((layer) => layer.id === selectedTargetId)
                  .map((layer) => (
                    <div key={`${layer.id}-frame`} className={layer.frameClassName}>
                      <div className="absolute -left-1.5 -top-1.5 size-3 rounded-full border border-sky-200 bg-sky-400" />
                      <div className="absolute -right-1.5 -top-1.5 size-3 rounded-full border border-sky-200 bg-sky-400" />
                      <div className="absolute -left-1.5 -bottom-1.5 size-3 rounded-full border border-sky-200 bg-sky-400" />
                      <div className="absolute -right-1.5 -bottom-1.5 size-3 rounded-full border border-sky-200 bg-sky-400" />
                    </div>
                  ))
              : null}
          </div>
        </div>
      </div>
    </section>
  )
}
