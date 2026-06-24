import "./index.css";
import {
  DEFAULT_RENDER_DOCUMENT,
  StudioPreviewComposition,
  renderDocumentSchema,
  type RenderDocument,
} from "@vidpilot/composition";
import { Composition, type CalculateMetadataFunction } from "remotion";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ExportRender"
        component={StudioPreviewComposition}
        defaultProps={DEFAULT_RENDER_DOCUMENT}
        calculateMetadata={calculateMetadata}
        durationInFrames={DEFAULT_RENDER_DOCUMENT.durationInFrames}
        fps={30}
        width={DEFAULT_RENDER_DOCUMENT.width}
        height={DEFAULT_RENDER_DOCUMENT.height}
      />
    </>
  );
};

const calculateMetadata: CalculateMetadataFunction<RenderDocument> = async ({ props }) => {
  const document = renderDocumentSchema.parse(props);

  return {
    props: document,
    width: document.width,
    height: document.height,
    fps: document.fps,
    durationInFrames: document.durationInFrames,
  };
};
