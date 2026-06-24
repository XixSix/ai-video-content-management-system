import { createTikTokStyleCaptions, type TikTokPage } from "@remotion/captions";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";

import type { RenderCaptionLayer } from "../render-document";

const SWITCH_CAPTIONS_EVERY_MS = 1200;

export const CaptionLayer: React.FC<{
  layer: RenderCaptionLayer;
}> = ({ layer }) => {
  const { fps } = useVideoConfig();
  const { pages } = createTikTokStyleCaptions({
    captions: layer.captions,
    combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS,
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
        pointerEvents: "none",
        translate: "-50% -50%",
      }}
    >
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
            <CaptionPage page={page} style={layer.style} />
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
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
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
