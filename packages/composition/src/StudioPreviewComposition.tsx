import { Video } from "@remotion/media";
import { AbsoluteFill, Sequence } from "remotion";

import { AudioLayer } from "./layers/AudioLayer";
import { CaptionLayer } from "./layers/CaptionLayer";
import { OverlayMediaLayer } from "./layers/OverlayMediaLayer";
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
      {document.overlayMediaLayers.map((layer) =>
        layer.src ? (
          <Sequence
            key={layer.id}
            from={layer.startFrame}
            durationInFrames={layer.durationInFrames}
          >
            <OverlayMediaLayer layer={layer} />
          </Sequence>
        ) : null,
      )}
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
          <CaptionLayer layer={layer} />
        </Sequence>
      ))}
      {document.audioLayers.map((layer) =>
        layer.src ? (
          <Sequence
            key={layer.id}
            from={layer.startFrame}
            durationInFrames={layer.durationInFrames}
          >
            <AudioLayer layer={layer} />
          </Sequence>
        ) : null,
      )}
    </AbsoluteFill>
  );
};
