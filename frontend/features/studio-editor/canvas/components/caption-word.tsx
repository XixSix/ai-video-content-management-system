import { TextAnimate } from "@/components/ui/text-animate"
import { cn } from "@/lib/utils"

import type {
  StudioCanvasLayer,
  StudioCaptionWordGroup,
} from "../../studio.types"
import { getCaptionWordStyle } from "../lib/layer-style"

export function CaptionWord({
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
