import { TextAnimate } from "@/components/ui/text-animate"
import { cn } from "@/lib/utils"

import type {
  StudioCanvasLayer,
  StudioCaptionCue,
} from "../../studio.types"
import { isWordGroupActive } from "../lib/caption-activity"
import {
  getCaptionContainerStyle,
  getTextLayerClassName,
  getTextLayerStyle,
} from "../lib/layer-style"
import { CaptionWord } from "./caption-word"

export function CanvasLayer({
  activeCue,
  currentTime,
  isSelected,
  layer,
  onSelect,
}: {
  activeCue: StudioCaptionCue | null
  currentTime: number
  isSelected: boolean
  layer: StudioCanvasLayer
  onSelect: (layer: StudioCanvasLayer) => void
}) {
  if (layer.kind === "captions" && !layer.enabled) {
    return null
  }

  return (
    <button
      type="button"
      aria-label={layer.label}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(layer)
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
}
