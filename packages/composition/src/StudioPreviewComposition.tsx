import { Video } from "@remotion/media";
import { AbsoluteFill, Sequence } from "remotion";

import { CaptionLayer } from "./layers/CaptionLayer";
import { TextLayer } from "./layers/TextLayer";
import type { RenderDocument } from "./render-document";

export const StudioPreviewComposition: React.FC<RenderDocument> = (document) => {
  return (
    <AbsoluteFill style={{ backgroundColor: document.backgroundColor }}>
      {document.sourceVideo.src ? (
        <Sequence
          from={document.sourceVideo.startFrame}
          durationInFrames={document.sourceVideo.durationInFrames}
        >
          <Video
            src={document.sourceVideo.src}
            muted={document.sourceVideo.muted}
            objectFit={document.sourceVideo.fit}
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        </Sequence>
      ) : null}
      {document.textLayers.map((layer) => (
        <Sequence
          key={layer.id}
          from={layer.startFrame}
          durationInFrames={layer.durationInFrames}
        >
          <TextLayer layer={layer} />
        </Sequence>
      ))}
      {document.captionLayers.map((layer) => (
        <Sequence
          key={layer.id}
          from={layer.startFrame}
          durationInFrames={layer.durationInFrames}
        >
          <CaptionLayer captions={layer.captions} style={layer.style} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
