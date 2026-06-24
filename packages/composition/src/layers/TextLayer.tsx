import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import type { RenderTextLayer } from "../render-document";

export const TextLayer: React.FC<{ layer: RenderTextLayer }> = ({ layer }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, Math.max(1, Math.round(fps * 0.2))], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        left: `${layer.xPercent}%`,
        top: `${layer.yPercent}%`,
        width: `${layer.widthPercent}%`,
        height: `${layer.heightPercent}%`,
        opacity,
        pointerEvents: "none",
        translate: "-50% -50%",
      }}
    >
      <div style={layer.style}>{layer.text}</div>
    </AbsoluteFill>
  );
};
