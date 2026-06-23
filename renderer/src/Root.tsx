import "./index.css";
import { Composition, type CalculateMetadataFunction } from "remotion";
import { ExportRenderComposition } from "./Composition";
import { renderDocumentSchema, type RenderDocument } from "./render-document";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ExportRender"
        component={ExportRenderComposition}
        defaultProps={defaultRenderDocument}
        calculateMetadata={calculateMetadata}
        durationInFrames={defaultRenderDocument.durationInFrames}
        fps={30}
        width={defaultRenderDocument.width}
        height={defaultRenderDocument.height}
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

const defaultRenderDocument: RenderDocument = {
  version: 1,
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 150,
  backgroundColor: "#000000",
  sourceVideo: {
    src: "",
    startFrame: 0,
    durationInFrames: 150,
    fit: "cover",
    muted: false,
  },
  textLayers: [],
  captionLayers: [],
};
