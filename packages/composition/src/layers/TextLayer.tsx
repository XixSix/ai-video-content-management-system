import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import type { RenderTextLayer } from "../render-document";

function getAnimatedTranslate(
  animationName: RenderTextLayer["animationName"],
  progress: number,
) {
  const offset = 32 * (1 - progress);

  switch (animationName) {
    case "blurInUp":
    case "slideUp":
      return `-50% calc(-50% + ${offset}px)`;
    case "blurInDown":
    case "slideDown":
      return `-50% calc(-50% - ${offset}px)`;
    case "slideLeft":
      return `calc(-50% + ${offset}px) -50%`;
    case "slideRight":
      return `calc(-50% - ${offset}px) -50%`;
    default:
      return "-50% -50%";
  }
}

export const TextLayer: React.FC<{ layer: RenderTextLayer }> = ({ layer }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const animationFrames = Math.max(
    1,
    Math.round(fps * (layer.animationDuration || 0.2)),
  );
  const progress = interpolate(frame, [0, animationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const opacity = interpolate(frame, [0, animationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const shouldBlur =
    layer.animationName === "blurIn" ||
    layer.animationName === "blurInUp" ||
    layer.animationName === "blurInDown";
  const shouldScale =
    layer.animationName === "scaleUp" || layer.animationName === "scaleDown";
  const scale = shouldScale
    ? interpolate(
        frame,
        [0, animationFrames],
        [layer.animationName === "scaleDown" ? 1.16 : 0.84, 1],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        },
      )
    : 1;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        left: `${layer.xPercent}%`,
        top: `${layer.yPercent}%`,
        width: `${layer.widthPercent}%`,
        height: `${layer.heightPercent}%`,
        filter: shouldBlur ? `blur(${(1 - progress) * 12}px)` : undefined,
        opacity: layer.animationName === "none" ? 1 : opacity,
        pointerEvents: "none",
        scale,
        translate: getAnimatedTranslate(layer.animationName, progress),
      }}
    >
      <div style={layer.style}>{layer.text}</div>
    </AbsoluteFill>
  );
};
