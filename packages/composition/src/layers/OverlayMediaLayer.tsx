import { Video } from "@remotion/media";
import { AbsoluteFill, Img } from "remotion";

import type { RenderOverlayMediaLayer } from "../render-document";

export const OverlayMediaLayer: React.FC<{
  layer: RenderOverlayMediaLayer;
}> = ({ layer }) => {
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        left: `${layer.xPercent}%`,
        top: `${layer.yPercent}%`,
        width: `${layer.widthPercent}%`,
        height: `${layer.heightPercent}%`,
        pointerEvents: "none",
        translate: "-50% -50%",
        ...layer.style,
      }}
    >
      {layer.mediaType === "VIDEO" ? (
        <Video
          src={layer.src}
          muted={layer.muted}
          objectFit={layer.fit}
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      ) : (
        <Img
          src={layer.src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: layer.fit,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
