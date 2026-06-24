import { createTikTokStyleCaptions, type Caption, type TikTokPage } from "@remotion/captions";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";

const SWITCH_CAPTIONS_EVERY_MS = 1200;

export const CaptionLayer: React.FC<{
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
