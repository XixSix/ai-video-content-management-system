import { createTikTokStyleCaptions, type Caption, type TikTokPage } from "@remotion/captions";
import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { RenderDocument, RenderTextLayer } from "./render-document";

const SWITCH_CAPTIONS_EVERY_MS = 1200;

export const ExportRenderComposition: React.FC<RenderDocument> = (document) => {
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

const TextLayer: React.FC<{ layer: RenderTextLayer }> = ({ layer }) => {
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
      }}
    >
      <div style={layer.style}>{layer.text}</div>
    </AbsoluteFill>
  );
};

const CaptionLayer: React.FC<{
  captions: Caption[];
  style: React.CSSProperties;
}> = ({ captions, style }) => {
  const { fps } = useVideoConfig();
  const { pages } = createTikTokStyleCaptions({
    captions,
    combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS,
  });

  return (
    <AbsoluteFill>
      {pages.map((page, index) => {
        const nextPage = pages[index + 1] ?? null;
        const startFrame = Math.round((page.startMs / 1000) * fps);
        const endFrame = Math.min(
          nextPage ? Math.round((nextPage.startMs / 1000) * fps) : Number.MAX_SAFE_INTEGER,
          startFrame + Math.round((SWITCH_CAPTIONS_EVERY_MS / 1000) * fps),
        );
        const durationInFrames = endFrame - startFrame;

        if (durationInFrames <= 0) {
          return null;
        }

        return (
          <Sequence key={`${page.startMs}-${index}`} from={startFrame} durationInFrames={durationInFrames}>
            <CaptionPage page={page} style={style} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const CaptionPage: React.FC<{ page: TikTokPage; style: React.CSSProperties }> = ({
  page,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const absoluteTimeMs = page.startMs + (frame / fps) * 1000;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: "12%" }}>
      <div style={{ ...style, whiteSpace: "pre" }}>
        {page.tokens.map((token) => {
          const isActive = token.fromMs <= absoluteTimeMs && token.toMs > absoluteTimeMs;

          return (
            <span
              key={`${token.fromMs}-${token.toMs}-${token.text}`}
              style={{ color: isActive ? "#facc15" : style.color }}
            >
              {token.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
